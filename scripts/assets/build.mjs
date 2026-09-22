#!/usr/bin/env node
// Builds everything the game loads into public/game/ (gitignored: it contains licensed
// pixels when real art is available). Run scripts/assets/fetch.mjs first; `pnpm build`
// does both. Placeholder mode produces files of the same shape without LimeZu art.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CHARACTERS } from "../../game/assets/manifest.ts";
import { FRAME_HEIGHT, FRAME_WIDTH, SHEET_COLUMNS, SHEET_ROWS, DIRECTIONS, ANIMS } from "../../game/characters/sheet.ts";
import { GREYBOX_MAPS } from "../../world/greybox/maps.ts";
import { GREYBOX_TILES } from "../../world/greybox/tiles.ts";
import { toTmj } from "../../world/tiled.ts";
import { buildBitmapFont } from "./font.mjs";
import { Raster, hex } from "./raster.mjs";

const TILE = 16;
const root = process.cwd();
const outDir = path.join(root, "public/game");
const sourceFile = path.join(root, ".assets-cache/source.json");

if (!fs.existsSync(sourceFile)) {
	console.error("[assets] .assets-cache/source.json is missing: run `pnpm assets` (fetch + build) instead.");
	process.exit(1);
}
const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
const charactersDir = source.dir && path.join(source.dir, "limezu/characters");

for (const sub of ["characters", "tilesets", "maps", "fonts"]) {
	fs.rmSync(path.join(outDir, sub), { recursive: true, force: true });
	fs.mkdirSync(path.join(outDir, sub), { recursive: true });
}

// --- Greybox tileset -------------------------------------------------------------

const TILESET_COLUMNS = 8;
async function buildGreyboxTileset() {
	const rows = Math.ceil(GREYBOX_TILES.length / TILESET_COLUMNS);
	const img = new Raster(TILESET_COLUMNS * TILE, rows * TILE);
	GREYBOX_TILES.forEach((tile, i) => {
		const ox = (i % TILESET_COLUMNS) * TILE;
		const oy = Math.floor(i / TILESET_COLUMNS) * TILE;
		const base = hex(tile.base);
		const accent = hex(tile.accent);
		img.rect(ox, oy, TILE, TILE, base);
		for (let y = 0; y < TILE; y++) {
			for (let x = 0; x < TILE; x++) {
				let on = false;
				switch (tile.pattern) {
					case "speckle": on = ((x * 7 + y * 13 + i * 5) % 11 === 0); break;
					case "dots": on = x % 4 === 1 && y % 4 === (x % 8 === 1 ? 1 : 3); break;
					case "stripes": on = y % 4 === 3; break;
					case "waves": on = (y % 6 === 2 && (x + y) % 8 < 4) || (y % 6 === 5 && (x + y + 4) % 8 < 3); break;
					case "bricks": on = y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0; break;
					case "planks": on = y % 5 === 4 || (x === (y < 8 ? 5 : 11)); break;
					case "block": on = x >= 3 && x <= 12 && y >= 3 && y <= 12 && (x === 3 || x === 12 || y === 3 || y === 12); break;
					case "cross": on = x === 0 || y === 0; break;
					case "flat": break;
				}
				if (on) img.px(ox + x, oy + y, accent);
			}
		}
	});
	await sharp(await img.toPng()).toFile(path.join(outDir, "tilesets/greybox.png"));
	return {
		name: "greybox",
		image: "../tilesets/greybox.png",
		columns: TILESET_COLUMNS,
		tileCount: GREYBOX_TILES.length,
		tileSize: TILE,
		colliding: GREYBOX_TILES.flatMap((t, i) => (t.collides ? [i] : [])),
	};
}

// --- Characters --------------------------------------------------------------------

const SHEET_W = SHEET_COLUMNS * FRAME_WIDTH;
const SHEET_H = SHEET_ROWS * FRAME_HEIGHT;

async function recolor(buffer, map) {
	const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const swaps = new Map(Object.entries(map).map(([from, to]) => [from.toLowerCase(), hex(to)]));
	for (let i = 0; i < data.length; i += 4) {
		if (!data[i + 3]) continue;
		const key = ((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]).toString(16).padStart(6, "0");
		const to = swaps.get(key);
		if (to) data.set(to.slice(0, 3), i);
	}
	return sharp(data, { raw: info }).png().toBuffer();
}

async function composeCharacter(id, recipe) {
	const layers = [];
	for (const layer of recipe.layers) {
		const file = path.join(charactersDir, layer);
		if (!fs.existsSync(file)) throw new Error(`Character "${id}": layer ${layer} does not exist in the assets repo`);
		// Some sheets are wider than the grid (Body_01 is 927 px); crop to the frames we use.
		let buf = await sharp(file).extract({ left: 0, top: 0, width: SHEET_W, height: SHEET_H }).png().toBuffer();
		if (recipe.recolor) buf = await recolor(buf, recipe.recolor);
		layers.push({ input: buf });
	}
	return sharp({ create: { width: SHEET_W, height: SHEET_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.composite(layers)
		.png()
		.toBuffer();
}

/** A stand-in figure with the same frame layout: body colour, lighter head, eyes that face. */
async function placeholderCharacter(recipe) {
	const img = new Raster(SHEET_W, SHEET_H);
	const body = hex(recipe.placeholder);
	const head = [...body.slice(0, 3).map((c) => Math.min(255, c + 70)), 255];
	const outline = hex("1b1b24");
	for (const spec of Object.values(ANIMS)) {
		DIRECTIONS.forEach((dir, d) => {
			for (let f = 0; f < spec.framesPerDirection; f++) {
				const ox = (d * spec.framesPerDirection + f) * FRAME_WIDTH;
				const oy = spec.row * FRAME_HEIGHT;
				const bob = spec === ANIMS.walk ? f % 2 : 0;
				img.rect(ox + 3, oy + 12 + bob, 10, 9, outline);
				img.rect(ox + 4, oy + 13 + bob, 8, 7, head);
				img.rect(ox + 4, oy + 21 + bob, 8, 7, body);
				const step = spec === ANIMS.walk ? (f % 3) - 1 : 0;
				img.rect(ox + 5 + step, oy + 28, 2, 3, outline);
				img.rect(ox + 9 - step, oy + 28, 2, 3, outline);
				const eyes = { right: [9, 11], left: [4, 6], down: [5, 9], up: null }[dir];
				if (eyes) for (const ex of eyes) img.rect(ox + ex, oy + 16 + bob, 1, 2, outline);
			}
		});
	}
	return img.toPng();
}

// --- Run ---------------------------------------------------------------------------

const started = Date.now();
const tileset = await buildGreyboxTileset();

for (const [id, recipe] of Object.entries(CHARACTERS)) {
	const png = source.mode === "placeholder" ? await placeholderCharacter(recipe) : await composeCharacter(id, recipe);
	fs.writeFileSync(path.join(outDir, `characters/${id}.png`), png);
}

for (const spec of GREYBOX_MAPS) {
	fs.writeFileSync(path.join(outDir, `maps/${spec.id}.tmj`), JSON.stringify(toTmj(spec, tileset)));
}

// Geist Pixel (OFL, from the geist package) as a 1-bit bitmap font for in-game text.
const font = await buildBitmapFont("node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2", 76, "pixel");
fs.writeFileSync(path.join(outDir, "fonts/pixel.png"), font.png);
fs.writeFileSync(path.join(outDir, "fonts/pixel.xml"), font.xml);

const manifest = {
	mode: source.mode,
	builtAt: new Date().toISOString(),
	characters: Object.keys(CHARACTERS),
	maps: GREYBOX_MAPS.map((m) => m.id),
	tilesets: [tileset.name],
	fonts: ["pixel"],
};
fs.writeFileSync(path.join(outDir, "assets.json"), JSON.stringify(manifest, null, "\t") + "\n");
console.log(
	`[assets] Built ${manifest.characters.length} characters, ${manifest.maps.length} maps, ` +
		`${manifest.tilesets.length} tileset (${source.mode} art) in ${Date.now() - started} ms`,
);
