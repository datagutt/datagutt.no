// Background music for the game (docs/game/PLAN.md B4): each loop in the MUSIC manifest,
// cut to its exact loop, levelled, and encoded twice, small: Opus in Ogg, and MP3 for
// browsers without Opus. Encoding takes a while, so results are cached in .assets-cache.
//
// The loops are whole bars (their tempos measure as round numbers), so the loop length is
// sacred: cutting a rest the composer wrote would move the downbeat at the join. Only the
// codec's own silence is cut. The source MP3s carry no gapless header (their decoded
// length is a whole number of 1152-sample frames), so decoding adds the encoder's and the
// decoder's delay in front and up to two frames of padding behind. Tax Office ends in a
// 0.2 s rest and Goodnight starts with a quiet moment; both are part of the loop.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const MP3_FRAME = 1152;
/** LAME's encoder delay (576) plus the decoder's (529), in samples. */
export const MP3_DELAY = 1105;
const MAX_PADDING = 2 * MP3_FRAME;
/** -60 dBFS: quieter than this at the very end is codec padding. */
const SILENCE = 0.001;
/**
 * Seconds of the loop's tail copied before it and of its head after it. A browser that
 * does not trim a codec's delay or padding then still loops seamlessly (see Music.ts).
 */
export const ROLL = 0.1;
/** Every track is turned down to the quietest one's loudness (Goodnight, about -19.4 LUFS). */
const TARGET_LUFS = -19.5;
const ENCODINGS = {
	ogg: ["-c:a", "libopus", "-b:a", "48k", "-vbr", "on", "-compression_level", "10", "-f", "ogg"],
	mp3: ["-c:a", "libmp3lame", "-q:a", "7", "-f", "mp3"],
};
/** Bump to rebuild every cached track after changing how tracks are cut or encoded. */
const CACHE_VERSION = 1;

/**
 * The loop inside a decoded track, in frames: after the codec delay (only there when the
 * decoder could not trim it) and before any padding at the end.
 * @param {Float32Array} pcm Interleaved stereo.
 */
export function loopBounds(pcm, channels = CHANNELS) {
	const frames = pcm.length / channels;
	const start = frames % MP3_FRAME === 0 ? MP3_DELAY : 0;
	const quiet = (frame) => {
		for (let c = 0; c < channels; c++) if (Math.abs(pcm[frame * channels + c]) >= SILENCE) return false;
		return true;
	};
	let end = frames;
	const floor = Math.max(start, frames - MAX_PADDING);
	while (end > floor && quiet(end - 1)) end--;
	return { start, end };
}

/**
 * The loop with `roll` frames of its own tail in front and of its head behind, scaled by
 * `gain`. Playing any stretch of the loop's length inside it wraps seamlessly.
 * @param {Float32Array} pcm Interleaved.
 */
export function withRoll(pcm, { start, end }, roll, gain = 1, channels = CHANNELS) {
	const length = end - start;
	if (roll > length) throw new Error(`A ${roll}-frame roll is longer than the ${length}-frame loop.`);
	const out = new Float32Array((length + 2 * roll) * channels);
	for (let i = 0; i < length + 2 * roll; i++) {
		const frame = start + ((i - roll + length) % length);
		for (let c = 0; c < channels; c++) out[i * channels + c] = pcm[frame * channels + c] * gain;
	}
	return out;
}

/** Runs ffmpeg, feeding `input` on stdin. Resolves with stdout and stderr. */
function ffmpeg(bin, args, input) {
	return new Promise((resolve, reject) => {
		const child = spawn(bin, ["-hide_banner", "-nostats", ...args], { stdio: ["pipe", "pipe", "pipe"] });
		const out = [];
		let err = "";
		child.stdout.on("data", (chunk) => out.push(chunk));
		child.stderr.on("data", (chunk) => (err += chunk));
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve({ stdout: Buffer.concat(out), stderr: err });
			else reject(new Error(`ffmpeg ${args.join(" ")} failed (${code}):\n${err.trim().split("\n").slice(-5).join("\n")}`));
		});
		child.stdin.on("error", () => {}); // a failed ffmpeg closes its input early; the exit code reports it
		child.stdin.end(input ?? null);
	});
}

async function encodeTrack(bin, file) {
	// Decode to float stereo at 44.1 kHz, and measure the loudness (EBU R128) apart: the
	// ebur128 filter can add a sample, which would hide the whole-frames length.
	const [decoded, measured] = await Promise.all([
		ffmpeg(bin, ["-i", file, "-ac", String(CHANNELS), "-ar", String(SAMPLE_RATE), "-f", "f32le", "pipe:1"]),
		ffmpeg(bin, ["-i", file, "-af", "ebur128", "-f", "null", "-"]),
	]);
	const lufs = Number(/Integrated loudness:\s*I:\s*(-?[\d.]+)\s*LUFS/.exec(measured.stderr)?.[1]);
	if (!Number.isFinite(lufs)) throw new Error(`Could not measure the loudness of ${file}`);
	const pcm = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, decoded.stdout.byteLength / 4);
	const bounds = loopBounds(pcm);
	const roll = Math.round(ROLL * SAMPLE_RATE);
	const gain = 10 ** (Math.min(0, TARGET_LUFS - lufs) / 20);
	const rolled = withRoll(pcm, bounds, roll, gain);
	const raw = Buffer.from(rolled.buffer, rolled.byteOffset, rolled.byteLength);
	const input = ["-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", String(CHANNELS), "-i", "pipe:0"];
	const files = {};
	for (const [ext, args] of Object.entries(ENCODINGS)) files[ext] = (await ffmpeg(bin, [...input, ...args, "pipe:1"], raw)).stdout;
	const loop = { loopStart: round(roll / SAMPLE_RATE), loopEnd: round((roll + bounds.end - bounds.start) / SAMPLE_RATE) };
	return { files, loop };
}

const round = (seconds) => Math.round(seconds * 1e6) / 1e6;

/** Runs `task` over `items`, `limit` at a time. */
async function pool(items, limit, task) {
	const results = [];
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await task(items[i]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/**
 * Builds every track into `outDir` and returns each one's loop points, or {} when the
 * assets checkout has no music folder (an older checkout).
 * @param {{ tracks: Record<string, { file: string }>, musicDir: string, outDir: string, cacheDir: string }} opts
 */
export async function buildMusic({ tracks, musicDir, outDir, cacheDir }) {
	if (!fs.existsSync(musicDir)) {
		console.warn(`[assets] No music/ folder in the assets checkout: building without music.`);
		return {};
	}
	// Imported here so placeholder builds never need the platform's ffmpeg binary.
	const { default: installer } = await import("@ffmpeg-installer/ffmpeg");
	fs.mkdirSync(cacheDir, { recursive: true });
	const settings = JSON.stringify({ CACHE_VERSION, SAMPLE_RATE, ROLL, TARGET_LUFS, ENCODINGS, SILENCE, MAX_PADDING });
	const entries = await pool(Object.entries(tracks), Math.max(1, os.availableParallelism() - 1), async ([id, track]) => {
		const file = path.join(musicDir, track.file);
		if (!fs.existsSync(file)) throw new Error(`Music "${id}": ${file} is missing from the assets checkout.`);
		const key = crypto.createHash("sha256").update(settings).update(fs.readFileSync(file)).digest("hex").slice(0, 16);
		const cached = (ext) => path.join(cacheDir, `${id}-${key}.${ext}`);
		if (!fs.existsSync(cached("json"))) {
			const { files, loop } = await encodeTrack(installer.path, file);
			for (const [ext, data] of Object.entries(files)) fs.writeFileSync(cached(ext), data);
			fs.writeFileSync(cached("json"), JSON.stringify(loop));
			for (const old of fs.readdirSync(cacheDir)) if (old.startsWith(`${id}-`) && !old.startsWith(`${id}-${key}.`)) fs.rmSync(path.join(cacheDir, old));
		}
		for (const ext of Object.keys(ENCODINGS)) fs.copyFileSync(cached(ext), path.join(outDir, `${id}.${ext}`));
		return [id, JSON.parse(fs.readFileSync(cached("json"), "utf8"))];
	});
	return Object.fromEntries(entries);
}
