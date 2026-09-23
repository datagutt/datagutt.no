#!/usr/bin/env node
// Builds everything the game loads into public/game/ (gitignored: it contains licensed
// pixels when real art is available). Run scripts/assets/fetch.mjs first; `pnpm build`
// does both. Placeholder mode produces files of the same shape without LimeZu art.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CHARACTERS } from "../../game/assets/manifest.ts";
import { parseMapObject } from "../../game/world/objects.ts";
import { EMOTE_COLUMNS, EMOTE_FRAME, EMOTE_TAIL, EMOTES } from "../../game/ui/emotes.ts";
import { buildAtlas, buildPlaceholderAtlas, SheetCache } from "../../world/gen/atlas.ts";
import { composeCharacter, composePortrait, placeholderCharacter, placeholderPortrait } from "./characters.mjs";
import { buildBitmapFont } from "./font.mjs";
import { compileDialogue } from "./ink.mjs";
import { Raster, hex } from "./raster.mjs";
import { shrinkPng } from "./png.mjs";

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
const portraitsDir = source.dir && path.join(source.dir, "limezu/portraits");
const portraitExists = (file) => fs.existsSync(path.join(portraitsDir, file));

for (const sub of ["characters", "portraits", "tilesets", "maps", "fonts", "dialogue", "ui"]) {
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

// Maps come from `pnpm world:gen` (world/maps). They share one packed tileset, from the
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

// Emote bubbles (game/ui/emotes.ts): LimeZu's thinking-emotes sheet as it is, or in
// placeholder mode white bubbles with a coloured mark in the frames the game uses.
async function buildEmotes() {
	if (source.mode !== "placeholder") {
		return sharp(path.join(source.dir, "limezu/interiors/ui_elements/UI_thinking_emotes_animation_16x16.png")).png().toBuffer();
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

// Geist Pixel (OFL, from the geist package) as a 1-bit bitmap font for in-game text.
const font = await buildBitmapFont("node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2", 76, "pixel");
fs.writeFileSync(path.join(outDir, "fonts/pixel.png"), font.png);
fs.writeFileSync(path.join(outDir, "fonts/pixel.xml"), font.xml);

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

const manifest = {
	mode: source.mode,
	builtAt: new Date().toISOString(),
	characters: Object.keys(CHARACTERS),
	portraits: Object.entries(CHARACTERS).flatMap(([id, r]) => (r.portrait !== false ? [id] : [])),
	maps: mapIds,
	tilesets: ["world"],
	fonts: ["pixel"],
	dialogue: dialogue.files,
};
fs.writeFileSync(path.join(outDir, "assets.json"), JSON.stringify(manifest, null, "\t") + "\n");
console.log(
	`[assets] Built ${manifest.characters.length} characters, ${manifest.maps.length} maps, ` +
		`${manifest.tilesets.length} tilesets (${source.mode} art) in ${Date.now() - started} ms`,
);
