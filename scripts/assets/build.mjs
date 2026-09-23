#!/usr/bin/env node
// Builds everything the game loads into public/game/ (gitignored: it contains licensed
// pixels when real art is available). Run scripts/assets/fetch.mjs first; `pnpm build`
// does both. Placeholder mode produces files of the same shape without LimeZu art.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CHARACTERS } from "../../game/assets/manifest.ts";
import {
	FRAME_HEIGHT,
	FRAME_WIDTH,
	SHEET_COLUMNS,
	SHEET_ROWS,
	DIRECTIONS,
	ANIMS,
	PORTRAIT_ANIMS,
	PORTRAIT_COLUMNS,
	PORTRAIT_CROP,
	PORTRAIT_SOURCE_FRAME,
} from "../../game/characters/sheet.ts";
import { GREYBOX_MAPS } from "../../world/greybox/maps.ts";
import { parseMapObject } from "../../game/world/objects.ts";
import { GREYBOX_TILES } from "../../world/greybox/tiles.ts";
import { toTmj } from "../../world/tiled.ts";
import { buildAtlas, buildPlaceholderAtlas, SheetCache } from "../../world/gen/atlas.ts";
import { buildBitmapFont } from "./font.mjs";
import { compileDialogue } from "./ink.mjs";
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

for (const sub of ["characters", "portraits", "tilesets", "maps", "fonts", "dialogue", "ui"]) {
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

// --- Portraits ----------------------------------------------------------------------

const PORTRAIT_ROWS = Object.keys(PORTRAIT_ANIMS).length;
const P = PORTRAIT_CROP.size;

/**
 * Portrait layers for a recipe: explicit ones, or derived from the sprite layers (the two
 * generators share numbering; outfits don't appear in head portraits). Accessories the
 * portrait generator lacks, such as backpacks, are skipped.
 */
export function portraitLayers(recipe, exists) {
	if (recipe.portrait === false) return null;
	if (Array.isArray(recipe.portrait)) return recipe.portrait;
	return recipe.layers.flatMap((layer) => {
		let m;
		if ((m = /^Bodies\/Body_0?(\d+)\.png$/.exec(layer))) return [`Skins/PG_Skin_${Number(m[1])}.png`];
		if ((m = /^Eyes\/Eyes_(\d+)\.png$/.exec(layer))) return [`Eyes/PG_Eyes_${m[1]}.png`];
		if ((m = /^Hairstyles\/Hairstyle_(\d+)_0?(\d+)\.png$/.exec(layer))) return [`Hairstyles/PG_Hairstyle_${m[1]}_${Number(m[2])}.png`];
		if ((m = /^Accessories\/Accessory_(.+)_0?(\d+)\.png$/.exec(layer))) {
			const candidate = `Accessories/PG_Accessory_${m[1]}_${Number(m[2])}.png`;
			return exists(candidate) ? [candidate] : [];
		}
		return [];
	});
}

/** Stack the portrait layers, then crop every frame to the area heads actually use. */
async function composePortrait(id, recipe) {
	const dir = path.join(source.dir, "limezu/portraits");
	const width = PORTRAIT_COLUMNS * PORTRAIT_SOURCE_FRAME;
	const height = PORTRAIT_ROWS * PORTRAIT_SOURCE_FRAME;
	const layers = [];
	for (const layer of portraitLayers(recipe, (f) => fs.existsSync(path.join(dir, f)))) {
		const file = path.join(dir, layer);
		if (!fs.existsSync(file)) throw new Error(`Portrait "${id}": layer ${layer} does not exist in the assets repo`);
		let buf = await sharp(file).extract({ left: 0, top: 0, width, height }).png().toBuffer();
		if (recipe.recolor) buf = await recolor(buf, recipe.recolor);
		layers.push({ input: buf });
	}
	const full = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.composite(layers)
		.png()
		.toBuffer();
	const frames = [];
	for (let row = 0; row < PORTRAIT_ROWS; row++) {
		for (let col = 0; col < PORTRAIT_COLUMNS; col++) {
			const input = await sharp(full)
				.extract({
					left: col * PORTRAIT_SOURCE_FRAME + PORTRAIT_CROP.x,
					top: row * PORTRAIT_SOURCE_FRAME + PORTRAIT_CROP.y,
					width: P,
					height: P,
				})
				.png()
				.toBuffer();
			frames.push({ input, left: col * P, top: row * P });
		}
	}
	return sharp({ create: { width: PORTRAIT_COLUMNS * P, height: PORTRAIT_ROWS * P, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.composite(frames)
		.png()
		.toBuffer();
}

/** A stand-in face: talking opens and closes the mouth, nodding bobs, shaking sways. */
async function placeholderPortrait(recipe) {
	const img = new Raster(PORTRAIT_COLUMNS * P, PORTRAIT_ROWS * P);
	const skin = hex(recipe.placeholder);
	const light = [...skin.slice(0, 3).map((c) => Math.min(255, c + 70)), 255];
	const ink = hex("1b1b24");
	for (let row = 0; row < PORTRAIT_ROWS; row++) {
		for (let col = 0; col < PORTRAIT_COLUMNS; col++) {
			const dx = row === 2 ? [0, -1, -2, -1, 0, 1, 2, 1, 0, 0][col] : 0;
			const dy = row === 1 ? [0, 1, 2, 1, 0, 1, 2, 1, 0, 0][col] : 0;
			const ox = col * P + 5 + dx;
			const oy = row * P + 4 + dy;
			img.rect(ox, oy, 15, 16, ink);
			img.rect(ox + 1, oy + 1, 13, 14, light);
			img.rect(ox + 1, oy + 1, 13, 4, skin);
			img.rect(ox + 4, oy + 7, 1, 2, ink);
			img.rect(ox + 10, oy + 7, 1, 2, ink);
			const open = row === 0 && col % 2 === 1;
			img.rect(ox + 6, oy + 11, 3, open ? 2 : 1, ink);
		}
	}
	return img.toPng();
}

// --- Run ---------------------------------------------------------------------------

const started = Date.now();
const tileset = await buildGreyboxTileset();

for (const [id, recipe] of Object.entries(CHARACTERS)) {
	const png = source.mode === "placeholder" ? await placeholderCharacter(recipe) : await composeCharacter(id, recipe);
	fs.writeFileSync(path.join(outDir, `characters/${id}.png`), png);
	if (recipe.portrait !== false) {
		const portrait = source.mode === "placeholder" ? await placeholderPortrait(recipe) : await composePortrait(id, recipe);
		fs.writeFileSync(path.join(outDir, `portraits/${id}.png`), portrait);
	}
}

for (const spec of GREYBOX_MAPS) {
	fs.writeFileSync(path.join(outDir, `maps/${spec.id}.tmj`), JSON.stringify(toTmj(spec, tileset)));
}

// Generated maps (world/maps, from `pnpm world:gen`) replace greybox maps of the same id.
// They share one packed tileset, from the art or from the committed colour sketches.
const worldDir = path.join(root, "world");
const generated = fs.readdirSync(path.join(worldDir, "maps")).filter((f) => f.endsWith(".tmj"));
const registry = JSON.parse(fs.readFileSync(path.join(worldDir, "tile-ids.json"), "utf8"));
const worldAtlas =
	source.mode === "placeholder"
		? await buildPlaceholderAtlas(registry.tiles, JSON.parse(fs.readFileSync(path.join(worldDir, "tile-colors.json"), "utf8")))
		: await buildAtlas(registry.tiles, new SheetCache(source.dir));
fs.writeFileSync(path.join(outDir, "tilesets/world.png"), worldAtlas);
const generatedMaps = generated.map((file) => {
	const tmj = JSON.parse(fs.readFileSync(path.join(worldDir, "maps", file), "utf8"));
	fs.writeFileSync(path.join(outDir, "maps", file), JSON.stringify(tmj));
	return { id: path.basename(file, ".tmj"), tmj };
});
const mapIds = [...new Set([...GREYBOX_MAPS.map((m) => m.id), ...generatedMaps.map((m) => m.id)])];

// Dialogue frame for a nine-slice: LimeZu's wood-rimmed parchment box (Modern UI style 1),
// or a drawn stand-in of the same size and palette in placeholder mode.
const FRAME = { left: 58, top: 129, width: 28, height: 29 };
async function buildUiFrame() {
	if (source.mode !== "placeholder") {
		return sharp(path.join(source.dir, "limezu/ui/Modern_UI_Style_1.png")).extract(FRAME).png().toBuffer();
	}
	const img = new Raster(FRAME.width, FRAME.height);
	const edge = hex("3b2a3a");
	img.rect(1, 0, FRAME.width - 2, FRAME.height - 1, edge);
	img.rect(0, 1, FRAME.width, FRAME.height - 3, edge);
	img.rect(1, 1, FRAME.width - 2, FRAME.height - 4, hex("b8733d"));
	img.rect(3, 3, FRAME.width - 6, FRAME.height - 8, edge);
	img.rect(4, 4, FRAME.width - 8, FRAME.height - 10, hex("c4a888"));
	return img.toPng();
}
fs.writeFileSync(path.join(outDir, "ui/frame.png"), await buildUiFrame());

// Geist Pixel (OFL, from the geist package) as a 1-bit bitmap font for in-game text.
const font = await buildBitmapFont("node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2", 76, "pixel");
fs.writeFileSync(path.join(outDir, "fonts/pixel.png"), font.png);
fs.writeFileSync(path.join(outDir, "fonts/pixel.xml"), font.xml);

// Ink dialogue, validated against the external registry (fails the build on bad ids).
const dialogue = compileDialogue("game/dialogue/ink");
fs.writeFileSync(path.join(outDir, "dialogue/main.json"), dialogue.json);
const mapObjects = [
	...GREYBOX_MAPS.map((spec) => ({ id: spec.id, objects: spec.objects })),
	...generatedMaps.map(({ id, tmj }) => ({
		id,
		objects: tmj.layers.filter((l) => l.type === "objectgroup").flatMap((l) => l.objects.map((o) => parseMapObject(o, TILE))),
	})),
];
// Doors must lead to a map that exists and a spawn on it.
const spawnsByMap = new Map(mapObjects.map(({ id, objects }) => [id, new Set(objects.filter((o) => o.type === "spawn").map((o) => o.id))]));
for (const { id, objects } of mapObjects) {
	for (const obj of objects) {
		if (obj.type !== "door") continue;
		const spawns = spawnsByMap.get(obj.toMap);
		if (!spawns) throw new Error(`${id}: door at (${obj.x}, ${obj.y}) leads to unknown map "${obj.toMap}"`);
		if (!spawns.has(obj.toSpawn)) throw new Error(`${id}: door at (${obj.x}, ${obj.y}) leads to missing spawn "${obj.toSpawn}" on ${obj.toMap}`);
	}
}
for (const { id, objects } of mapObjects) {
	for (const obj of objects) {
		if (obj.type === "npc" && !dialogue.knots.includes(obj.dialogue)) {
			throw new Error(`${id}: NPC "${obj.id}" uses dialogue "${obj.dialogue}", which is not a knot. Knots: ${dialogue.knots.join(", ")}`);
		}
	}
}

const manifest = {
	mode: source.mode,
	builtAt: new Date().toISOString(),
	characters: Object.keys(CHARACTERS),
	portraits: Object.entries(CHARACTERS).flatMap(([id, r]) => (r.portrait !== false ? [id] : [])),
	maps: mapIds,
	tilesets: [tileset.name, "world"],
	fonts: ["pixel"],
	dialogue: dialogue.files,
};
fs.writeFileSync(path.join(outDir, "assets.json"), JSON.stringify(manifest, null, "\t") + "\n");
console.log(
	`[assets] Built ${manifest.characters.length} characters, ${manifest.maps.length} maps, ` +
		`${manifest.tilesets.length} tilesets (${source.mode} art) in ${Date.now() - started} ms`,
);
