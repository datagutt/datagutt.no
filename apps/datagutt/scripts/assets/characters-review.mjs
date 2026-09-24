#!/usr/bin/env node
// Contact sheet of every character recipe for review: the four standing directions and the
// portrait, at 1x on grass (how they read in game) and at 4x (to check the pixels).
// Composes straight from the recipes, so no `bun run assets` run is needed in between.
// Writes world/out/characters.png (gitignored: LimeZu pixels).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CHARACTERS } from "../../game/assets/manifest.ts";
import { DIRECTIONS, FRAME_HEIGHT, FRAME_WIDTH, PORTRAIT_CROP } from "../../game/characters/sheet.ts";
import { composeCharacter, composePortrait } from "./characters.mjs";
import { localArtDir } from "./source.mjs";

const root = process.cwd();
const source = { dir: localArtDir(root) };
if (!source.dir) {
	console.error("[characters] Needs a local checkout of the art repository (kai.json assets.localPath).");
	process.exit(1);
}
const charactersDir = path.join(source.dir, "limezu/characters");
const portraitsDir = path.join(source.dir, "limezu/portraits");

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

const up = (png, w, h) => sharp(png).resize(w * ZOOM, h * ZOOM, { kernel: "nearest" }).png().toBuffer();
const label = (text) =>
	Buffer.from(`<svg width="${cellW}" height="16"><text x="0" y="12" font-size="12" font-family="monospace" fill="#fff">${text}</text></svg>`);

const layers = [];
const ids = Object.keys(CHARACTERS);
for (const [i, id] of ids.entries()) {
	const recipe = CHARACTERS[id];
	const left = (i % COLUMNS) * cellW + PAD;
	const top = Math.floor(i / COLUMNS) * cellH + PAD;
	const sheet = await composeCharacter(charactersDir, id, recipe);
	for (let d = 0; d < DIRECTIONS.length; d++) {
		// Row 0 holds one standing frame per direction.
		const frame = await sharp(sheet).extract({ left: d * FRAME_WIDTH, top: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT }).png().toBuffer();
		layers.push({ input: frame, left: left + d * STEP, top: top + FRAME_HEIGHT * (ZOOM - 1) });
		layers.push({ input: await up(frame, FRAME_WIDTH, FRAME_HEIGHT), left: left + bigLeft + d * STEP * ZOOM, top });
	}
	if (recipe.portrait !== false) {
		const portraits = await composePortrait(portraitsDir, id, recipe, (f) => fs.existsSync(path.join(portraitsDir, f)));
		const face = await sharp(portraits).extract({ left: 0, top: 0, width: P, height: P }).png().toBuffer();
		layers.push({ input: face, left: left + DIRECTIONS.length * STEP, top: top + FRAME_HEIGHT * ZOOM - P });
		layers.push({ input: await up(face, P, P), left: left + bigLeft + DIRECTIONS.length * STEP * ZOOM, top });
	}
	layers.push({ input: label(id), left, top: top + FRAME_HEIGHT * ZOOM + 2 });
}

const out = path.join(root, "world/out/characters.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp({
	create: { width: COLUMNS * cellW + PAD, height: Math.ceil(ids.length / COLUMNS) * cellH + PAD, channels: 4, background: "#5b8a4f" },
})
	.composite(layers)
	.png()
	.toFile(out);
console.log(`[characters] ${ids.length} characters -> ${path.relative(root, out)}`);
