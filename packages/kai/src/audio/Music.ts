// Background music: one looping track at a time on the music bus, into Phaser's output so
// the mute setting holds. Callers say which track should be playing, as often as they like
// (GameData.trackFor picks it), and a change crossfades.
//
// Nothing loads until a track is first wanted, so music adds nothing to the first load.
// Each track is Opus, or MP3 where the browser has no Opus, with a tenth of a second of
// its own tail before the loop and head after it (the asset build's music step). A decoder that
// leaves a codec delay in front then only shifts where the loop starts: the join between
// loopEnd and loopStart stays seamless.
/** A track id in the game's music (content/music.json). */
type MusicId = string;
/** Where a built track loops, in seconds from the start of its file (assets.json `music`). */
type MusicLoop = { loopStart: number; loopEnd: number };
import type { AudioOutput } from "./sfx.ts";

/** The music bus, under the effects and well over the ambience (Ambience.ts PEAK). */
const LEVEL = 0.5;
/** Seconds a crossfade takes. */
const FADE = 2.5;
/** Decoded tracks kept, the playing one included: two minutes of stereo is about 45 MB. */
const KEEP = 2;
/** How often to look again while the audio context waits for a first gesture. */
const RETRY_MS = 300;

type Track = { buffer: AudioBuffer; loop: MusicLoop };
type Playing = { id: MusicId; source: AudioBufferSourceNode; gain: GainNode };

export class Music {
	private wanted: MusicId | null = null;
	private playing: Playing | null = null;
	private bus: GainNode | null = null;
	private catalogue: Promise<Partial<Record<MusicId, MusicLoop>>> | null = null;
	private readonly tracks = new Map<MusicId, Promise<Track | null>>();
	private retry: ReturnType<typeof setTimeout> | null = null;
	private destroyed = false;

	/** `output` is Phaser's Web Audio context and output, read lazily; `base` is the asset URL prefix. */
	constructor(
		private readonly output: AudioOutput,
		private readonly base: string,
	) {}

	/** The track that should be playing, or null for none. Cheap to call every frame. */
	play(id: MusicId | null): void {
		if (id === this.wanted) return;
		this.wanted = id;
		void this.update();
	}

	/** The track playing now (for the ?debug readout and tests). */
	get current(): MusicId | null {
		return this.playing?.id ?? null;
	}

	private async update(): Promise<void> {
		const id = this.wanted;
		if (this.destroyed || this.playing?.id === id) return;
		if (id === null) return this.fadeOut();
		const out = this.output();
		// Browsers start audio only after a gesture; look again until then.
		if (!out || out.context.state !== "running") {
			this.retry ??= setTimeout(() => {
				this.retry = null;
				void this.update();
			}, RETRY_MS);
			return;
		}
		const track = await this.load(id, out.context);
		// The wish may have changed while the track loaded.
		if (this.destroyed || id !== this.wanted || this.playing?.id === id) return;
		if (!track) return this.fadeOut();
		this.crossfade(id, track, out.context, this.ensureBus(out.destination));
	}

	private ensureBus(destination: AudioNode): GainNode {
		if (!this.bus) {
			this.bus = destination.context.createGain();
			this.bus.gain.value = LEVEL;
			this.bus.connect(destination);
		}
		return this.bus;
	}

	private crossfade(id: MusicId, { buffer, loop }: Track, ctx: BaseAudioContext, bus: GainNode): void {
		this.fadeOut();
		const now = ctx.currentTime;
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		source.loopStart = loop.loopStart;
		source.loopEnd = Math.min(loop.loopEnd, buffer.duration);
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(1, now + FADE);
		source.connect(gain).connect(bus);
		source.start(now, loop.loopStart);
		this.playing = { id, source, gain };
	}

	private fadeOut(): void {
		const playing = this.playing;
		if (!playing) return;
		this.playing = null;
		const { source, gain } = playing;
		const now = gain.context.currentTime;
		gain.gain.cancelScheduledValues(now);
		gain.gain.setValueAtTime(gain.gain.value, now);
		gain.gain.linearRampToValueAtTime(0, now + FADE);
		source.onended = () => gain.disconnect();
		source.stop(now + FADE);
	}

	/** A track decoded, from the cache when it's there. Null when it can't be had. */
	private load(id: MusicId, ctx: BaseAudioContext): Promise<Track | null> {
		let track = this.tracks.get(id);
		if (track) this.tracks.delete(id); // re-added below as the most recent
		else track = this.fetchTrack(id, ctx);
		this.tracks.set(id, track);
		for (const old of this.tracks.keys()) {
			if (this.tracks.size <= KEEP) break;
			if (old !== id && old !== this.playing?.id) this.tracks.delete(old);
		}
		return track;
	}

	private async fetchTrack(id: MusicId, ctx: BaseAudioContext): Promise<Track | null> {
		// Loop points come from the asset build's manifest; placeholder builds list no music.
		this.catalogue ??= fetch(`${this.base}assets.json`)
			.then((res) => (res.ok ? res.json() : {}))
			.then((manifest: { music?: Partial<Record<MusicId, MusicLoop>> }) => manifest.music ?? {})
			.catch(() => ({}));
		const loop = (await this.catalogue)[id];
		if (!loop) return null;
		for (const ext of formats()) {
			try {
				const res = await fetch(`${this.base}music/${id}.${ext}`);
				if (!res.ok) continue;
				return { buffer: await ctx.decodeAudioData(await res.arrayBuffer()), loop };
			} catch {
				// Not decodable here (or offline): try the next format.
			}
		}
		console.warn(`[music] could not load "${id}"`);
		return null;
	}

	destroy(): void {
		this.destroyed = true;
		if (this.retry) clearTimeout(this.retry);
		this.playing?.source.stop();
		this.playing = null;
		this.bus?.disconnect();
		this.bus = null;
		this.tracks.clear();
	}
}

/** Opus where the browser says it can play it, with MP3 after it as the fallback. */
function formats(): ("ogg" | "mp3")[] {
	const opus = typeof Audio !== "undefined" && new Audio().canPlayType('audio/ogg; codecs="opus"') !== "";
	return opus ? ["ogg", "mp3"] : ["mp3"];
}
