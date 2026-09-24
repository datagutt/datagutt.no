#!/usr/bin/env node
// Builds everything the game loads into public/game/ (gitignored: it contains licensed
// pixels when real art is available). Run scripts/assets/fetch.mjs first; `bun run assets`
// does both. Placeholder mode produces files of the same shape without LimeZu art.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import { loadKaiConfig } from "@datagutt/kai/schema";
import { CHARACTERS, MUSIC } from "../../game/assets/manifest.ts";
import { parseMapObject } from "@datagutt/kai/world/objects";
import { isArcadeId } from "../../game/arcade/ids.ts";
import { isUnlockId } from "../../game/progress/unlockIds.ts";
import { EMOTE_COLUMNS, EMOTE_FRAME, EMOTE_TAIL, EMOTES } from "../../game/ui/emotes.ts";
import { buildAtlas, buildPlaceholderAtlas, SheetCache } from "../../world/gen/atlas.ts";
import { TileRegistry } from "../../world/gen/registry.ts";
import { renderTmj } from "../../world/gen/render.ts";
import { titleScene } from "../../world/gen/title.ts";
import { canvasToTmj } from "../../world/gen/tmj.ts";
import { composeCharacter, composePortrait, placeholderCharacter, placeholderPortrait } from "./characters.mjs";
import { buildBitmapFont } from "./font.mjs";
import { buildOgImage } from "./og.mjs";
import { compileDialogue } from "./ink.mjs";
import { buildMusic } from "./music.mjs";
import { Raster, hex } from "./raster.mjs";
import { shrinkPng } from "./png.mjs";

const TILE = 16;
const root = process.cwd();
const outDir = path.join(root, "public/game");
const sourceFile = path.join(root, ".assets-cache/source.json");
const config = loadKaiConfig(root);

if (!fs.existsSync(sourceFile)) {
	console.error("[assets] .assets-cache/source.json is missing: run `bun run assets` (fetch + build) instead.");
	process.exit(1);
}
const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
const charactersDir = source.dir && path.join(source.dir, "limezu/characters");
const portraitsDir = source.dir && path.join(source.dir, "limezu/portraits");
const portraitExists = (file) => fs.existsSync(path.join(portraitsDir, file));

for (const sub of ["characters", "portraits", "tilesets", "maps", "fonts", "dialogue", "ui", "music"]) {
	fs.rmSync(path.join(outDir, sub), { recursive: true, force: true });
	fs.mkdirSync(path.join(outDir, sub), { recursive: true });
}

// --- Run ---------------------------------------------------------------------------

const started = Date.now();

for (const [id, recipe] of Object.entries(CHARACTERS)) {
	const png = source.mode === "placeholder" ? await placeholderCharacter(recipe) : await composeCharacter(charactersDir, id, recipe);
	fs.writeFileSync(path.join(outDir, `characters/${id}.png`), await shrinkPng(png));
	if (recipe.portrait !== false) {
		const portrait = source.mode === "placeholder" ? await placeholderPortrait(recipe) : await composePortrait(portraitsDir, id, recipe, portraitExists);
		fs.writeFileSync(path.join(outDir, `portraits/${id}.png`), await shrinkPng(portrait));
	}
}

// Maps come from `bun run world:gen` (world/maps). They share one packed tileset, from the
// art or from the committed colour sketches.
const worldDir = path.join(root, "world");
const generated = fs.readdirSync(path.join(worldDir, "maps")).filter((f) => f.endsWith(".tmj"));
const registry = JSON.parse(fs.readFileSync(path.join(worldDir, "tile-ids.json"), "utf8"));
const worldAtlas =
	source.mode === "placeholder"
		? await buildPlaceholderAtlas(registry.tiles, JSON.parse(fs.readFileSync(path.join(worldDir, "tile-colors.json"), "utf8")))
		: await buildAtlas(registry.tiles, new SheetCache(source.dir));
fs.writeFileSync(path.join(outDir, "tilesets/world.png"), await shrinkPng(worldAtlas));
const generatedMaps = generated.map((file) => {
	const tmj = JSON.parse(fs.readFileSync(path.join(worldDir, "maps", file), "utf8"));
	fs.writeFileSync(path.join(outDir, "maps", file), JSON.stringify(tmj));
	return { id: path.basename(file, ".tmj"), tmj };
});
const mapIds = generatedMaps.map((m) => m.id);

// Dialogue frame for a nine-slice, cut from a sheet (kai.json ui.frame), or a drawn
// stand-in of the same size in placeholder mode.
const FRAME = { left: config.ui.frame.x, top: config.ui.frame.y, width: config.ui.frame.width, height: config.ui.frame.height };
async function buildUiFrame() {
	if (source.mode !== "placeholder") {
		return sharp(path.join(source.dir, config.ui.frame.file)).extract(FRAME).png().toBuffer();
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

// Emote bubbles (game/ui/emotes.ts): the sheet from kai.json ui.emotes as it is, or in
// placeholder mode white bubbles with a coloured mark in the frames the game uses.
async function buildEmotes() {
	if (source.mode !== "placeholder") {
		return sharp(path.join(source.dir, config.ui.emotes)).png().toBuffer();
	}
	const size = EMOTE_FRAME * EMOTE_COLUMNS;
	const img = new Raster(size, size);
	const ink = hex("3b2a3a");
	const white = hex("f2eef7");
	const marks = ["4a7fd6", "8e5cc4", "3aa0c8", "7a7a90", "e0a020", "d05a3a", "d8404f"];
	Object.values(EMOTES).forEach(([col, row], i) => {
		for (const dx of [0, 1]) {
			const x = (col + dx) * EMOTE_FRAME;
			const y = row * EMOTE_FRAME;
			img.rect(x + 2, y + 1, 12, 13, ink);
			img.rect(x + 3, y + 2, 10, 11, white);
			img.rect(x + 6, y + 5, 4, 5, hex(marks[i % marks.length]));
		}
	});
	const [tx, ty] = EMOTE_TAIL;
	img.rect(tx * EMOTE_FRAME + 7, ty * EMOTE_FRAME + 2, 2, 2, white);
	img.rect(tx * EMOTE_FRAME + 6, ty * EMOTE_FRAME + 6, 2, 2, white);
	return img.toPng();
}
fs.writeFileSync(path.join(outDir, "ui/emotes.png"), await shrinkPng(await buildEmotes()));

// Animated sprite strips (kai.json sprites) as they are, or in placeholder mode a grey
// shape in the lower middle of each frame that breathes.
async function buildSprite({ file, frameWidth, frameHeight, frames }) {
	if (source.mode !== "placeholder") return sharp(path.join(source.dir, file)).png().toBuffer();
	const img = new Raster(frameWidth * frames, frameHeight);
	const width = Math.max(2, Math.round(frameWidth / 2));
	const height = Math.max(2, Math.round(frameHeight * 0.4));
	for (let f = 0; f < frames; f++) {
		const inhale = f % 4 < 2 ? 1 : 0;
		img.rect(f * frameWidth + Math.round((frameWidth - width) / 2), frameHeight - height - 1 + (1 - inhale), width, height - 1 + inhale, hex("8a8fa8"));
	}
	return img.toPng();
}
for (const [name, sprite] of Object.entries(config.sprites)) {
	fs.writeFileSync(path.join(outDir, `ui/${name}.png`), await shrinkPng(await buildSprite(sprite)));
}

// The title screen's waterfront (world/gen/title.ts) and the link-preview image, drawn
// from the same sheets as the maps. Placeholder builds have no sheets to draw them from:
// the title shows its sky alone and link previews go without a picture.
let waterfront = null;
fs.rmSync(path.join(outDir, "og.png"), { force: true });
if (source.mode !== "placeholder") {
	const titleTiles = new TileRegistry(registry);
	const tmj = canvasToTmj("title", titleScene(), titleTiles);
	waterfront = await renderTmj(tmj, titleTiles.tiles, new SheetCache(source.dir));
	fs.writeFileSync(path.join(outDir, "ui/title.png"), await shrinkPng(waterfront));
}

// The web font from kai.json font (for datagutt, Geist Pixel from the geist package, OFL)
// as a 1-bit bitmap font for in-game text.
const fontDir = path.dirname(createRequire(path.join(root, "package.json")).resolve(config.font.module));
const font = await buildBitmapFont(path.join(fontDir, config.font.file), config.font.unitsPerPixel, "pixel");
fs.writeFileSync(path.join(outDir, "fonts/pixel.png"), font.png);
fs.writeFileSync(path.join(outDir, "fonts/pixel.xml"), font.xml);
if (waterfront) fs.writeFileSync(path.join(outDir, "og.png"), await shrinkPng(await buildOgImage(waterfront, font)));

// Ink dialogue, validated against the external registry (fails the build on bad ids).
const dialogue = compileDialogue("game/dialogue/ink");
fs.writeFileSync(path.join(outDir, "dialogue/main.json"), dialogue.json);
const mapObjects = [
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
// Map objects name Fjord Town's unlocks and arcade games as plain strings.
for (const { id, objects } of mapObjects) {
	for (const obj of objects) {
		const unlock = obj.type === "door" || obj.type === "gate" ? obj.unlock : undefined;
		if (unlock !== undefined && !isUnlockId(unlock)) throw new Error(`${id}: ${obj.type} at (${obj.x}, ${obj.y}) has unknown unlock "${unlock}"`);
		if (obj.type === "arcade" && !isArcadeId(obj.game)) throw new Error(`${id}: arcade at (${obj.x}, ${obj.y}) has unknown game "${obj.game}"`);
	}
}
for (const { id, objects } of mapObjects) {
	for (const obj of objects) {
		if (obj.type === "sign" && obj.dialogue && !dialogue.knots.includes(obj.dialogue)) {
			throw new Error(`${id}: sign at (${obj.x}, ${obj.y}) uses dialogue "${obj.dialogue}", which is not a knot.`);
		}
		if (obj.type === "npc" && !dialogue.knots.includes(obj.dialogue)) {
			throw new Error(`${id}: NPC "${obj.id}" uses dialogue "${obj.dialogue}", which is not a knot. Knots: ${dialogue.knots.join(", ")}`);
		}
	}
}

// Music (scripts/assets/music.mjs). Placeholder builds have none, and the game stays quiet.
const music =
	source.mode === "placeholder"
		? {}
		: await buildMusic({ tracks: MUSIC, musicDir: path.join(source.dir, "music"), outDir: path.join(outDir, "music"), cacheDir: path.join(root, ".assets-cache/music") });

const manifest = {
	mode: source.mode,
	builtAt: new Date().toISOString(),
	characters: Object.keys(CHARACTERS),
	portraits: Object.entries(CHARACTERS).flatMap(([id, r]) => (r.portrait !== false ? [id] : [])),
	maps: mapIds,
	tilesets: ["world"],
	fonts: ["pixel"],
	dialogue: dialogue.files,
	music,
};
fs.writeFileSync(path.join(outDir, "assets.json"), JSON.stringify(manifest, null, "\t") + "\n");
console.log(
	`[assets] Built ${manifest.characters.length} characters, ${manifest.maps.length} maps, ` +
		`${manifest.tilesets.length} tilesets, ${Object.keys(music).length} music tracks (${source.mode} art) in ${Date.now() - started} ms`,
);
