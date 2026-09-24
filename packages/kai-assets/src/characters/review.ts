// `kai characters`: a contact sheet of every character recipe for review, the four
// standing directions and the portrait, at 1x on grass (how they read in game) and at 4x
// (to check the pixels). Composes straight from the recipes, so no asset build is needed
// in between. Writes world/out/characters.png (gitignored: licensed pixels).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DIRECTIONS, FRAME_HEIGHT, FRAME_WIDTH, PORTRAIT_CROP } from "@datagutt/kai/characters/sheet";
import type { CharacterRecipe } from "@datagutt/kai/schema/engine";
import type { KaiApp } from "../app.ts";
import { localArtDir } from "../art/source.ts";

const ZOOM = 4;
const P = PORTRAIT_CROP.size;
const PAD = 8;
const COLUMNS = 2;
// Each character gets a 1x strip, then the same at 4x, with its id underneath.
const STEP = FRAME_WIDTH + 2;
const smallW = DIRECTIONS.length * STEP + P;
const bigLeft = smallW + PAD * 2;
const cellW = PAD + bigLeft + (DIRECTIONS.length * STEP + P) * ZOOM + PAD;
const cellH = FRAME_HEIGHT * ZOOM + 24;

const up = (png: Buffer, w: number, h: number) => sharp(png).resize(w * ZOOM, h * ZOOM, { kernel: "nearest" }).png().toBuffer();
const label = (text: string) =>
	Buffer.from(`<svg width="${cellW}" height="16"><text x="0" y="12" font-size="12" font-family="monospace" fill="#fff">${text}</text></svg>`);

export async function reviewCharacters(app: KaiApp): Promise<void> {
	const adapter = await app.adapter();
	const artDir = localArtDir(app.dir, app.config.assets, adapter.isArtDir);
	if (!artDir) throw new Error("[characters] Needs a local checkout of the art repository (kai.json assets.localPath).");
	const characters: Record<string, CharacterRecipe> = JSON.parse(fs.readFileSync(path.join(app.dir, ".kai/content.json"), "utf8")).characters;

	const layers = [];
	const ids = Object.keys(characters);
	for (const [i, id] of ids.entries()) {
		const recipe = characters[id];
		const left = (i % COLUMNS) * cellW + PAD;
		const top = Math.floor(i / COLUMNS) * cellH + PAD;
		const sheet = await adapter.character(artDir, id, recipe);
		for (let d = 0; d < DIRECTIONS.length; d++) {
			// Row 0 holds one standing frame per direction.
			const frame = await sharp(sheet).extract({ left: d * FRAME_WIDTH, top: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT }).png().toBuffer();
			layers.push({ input: frame, left: left + d * STEP, top: top + FRAME_HEIGHT * (ZOOM - 1) });
			layers.push({ input: await up(frame, FRAME_WIDTH, FRAME_HEIGHT), left: left + bigLeft + d * STEP * ZOOM, top });
		}
		const portraits = await adapter.portrait(artDir, id, recipe);
		if (portraits) {
			const face = await sharp(portraits).extract({ left: 0, top: 0, width: P, height: P }).png().toBuffer();
			layers.push({ input: face, left: left + DIRECTIONS.length * STEP, top: top + FRAME_HEIGHT * ZOOM - P });
			layers.push({ input: await up(face, P, P), left: left + bigLeft + DIRECTIONS.length * STEP * ZOOM, top });
		}
		layers.push({ input: label(id), left, top: top + FRAME_HEIGHT * ZOOM + 2 });
	}

	const out = path.join(app.worldDir, "out/characters.png");
	fs.mkdirSync(path.dirname(out), { recursive: true });
	await sharp({
		create: { width: COLUMNS * cellW + PAD, height: Math.ceil(ids.length / COLUMNS) * cellH + PAD, channels: 4, background: "#5b8a4f" },
	})
		.composite(layers)
		.png()
		.toFile(out);
	console.log(`[characters] ${ids.length} characters -> ${path.relative(app.dir, out)}`);
}
