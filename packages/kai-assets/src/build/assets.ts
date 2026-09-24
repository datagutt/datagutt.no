// `kai assets`: builds everything the game loads into public/<basePath> (gitignored: it
// holds licensed pixels when real art is available), from the art the fetch step found.
// Placeholder mode produces files of the same shape without the licensed art.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";
import { parseMapObject, type MapObject, type TiledObject } from "@datagutt/kai/world/objects";
import { EMOTE_COLUMNS, EMOTE_FRAME, EMOTE_TAIL, EMOTES } from "@datagutt/kai/ui/emotes";
import type { CharacterRecipe } from "@datagutt/kai/schema/engine";
import { buildAtlas, buildPlaceholderAtlas } from "@datagutt/kai-worldgen/atlas";
import type { KaiApp } from "../app.ts";
import { sourceFile } from "../art/fetch.ts";
import { seasonOverridesDir, type AssetSource } from "../art/source.ts";
import { shrinkPng } from "../png.ts";
import { hex, Raster } from "../raster.ts";
import { buildBitmapFont } from "./font.mjs";
import { compileDialogue } from "./ink.ts";
import { buildMusic } from "./music.mjs";
import { placeholderCharacter, placeholderPortrait, placeholderSprite } from "./placeholders.ts";

const TILE = 16;

/** The parts of the content bundle the build reads. */
type BuildContent = {
	characters: Record<string, CharacterRecipe>;
	music: { tracks: Record<string, { file: string }> };
	unlocks: Record<string, unknown>;
};

/** Where the fetch step found the art. Run `kai assets` (fetch and build), not the build alone. */
export function readSource(app: KaiApp): AssetSource {
	if (!fs.existsSync(sourceFile(app))) throw new Error("[assets] .assets-cache/source.json is missing: run `kai assets` (fetch and build).");
	return JSON.parse(fs.readFileSync(sourceFile(app), "utf8"));
}

/** The in-game bitmap font, from the web font kai.json names. */
export async function buildFont(app: KaiApp) {
	const { font } = app.config;
	const fontDir = path.dirname(createRequire(path.join(app.dir, "package.json")).resolve(font.module));
	return buildBitmapFont(path.join(fontDir, font.file), font.unitsPerPixel, "pixel");
}

export async function buildAssets(app: KaiApp): Promise<void> {
	const { config, outDir } = app;
	const source = readSource(app);
	const adapter = await app.adapter();
	const content: BuildContent = JSON.parse(fs.readFileSync(path.join(app.dir, ".kai/content.json"), "utf8"));
	const art = source.dir;

	for (const sub of ["characters", "portraits", "tilesets", "maps", "fonts", "dialogue", "ui", "music"]) {
		fs.rmSync(path.join(outDir, sub), { recursive: true, force: true });
		fs.mkdirSync(path.join(outDir, sub), { recursive: true });
	}
	const started = Date.now();
	const write = (file: string, data: Buffer | string) => fs.writeFileSync(path.join(outDir, file), data);

	const portraits: string[] = [];
	for (const [id, recipe] of Object.entries(content.characters)) {
		write(`characters/${id}.png`, await shrinkPng(art ? await adapter.character(art, id, recipe) : await placeholderCharacter(recipe)));
		if (recipe.portrait === false) continue;
		const portrait = art ? await adapter.portrait(art, id, recipe) : await placeholderPortrait(recipe);
		if (!portrait) continue;
		write(`portraits/${id}.png`, await shrinkPng(portrait));
		portraits.push(id);
	}

	// Maps come from `kai world gen` (world/maps). They share one packed tileset, from the
	// art or from the committed colour sketches.
	const { worldDir } = app;
	const registry = JSON.parse(fs.readFileSync(path.join(worldDir, "tile-ids.json"), "utf8"));
	const atlas = art
		? await buildAtlas(registry.tiles, adapter.sheets(art, { overridesDir: seasonOverridesDir(config) }))
		: await buildPlaceholderAtlas(registry.tiles, JSON.parse(fs.readFileSync(path.join(worldDir, "tile-colors.json"), "utf8")));
	write("tilesets/world.png", await shrinkPng(atlas));
	const maps = fs
		.readdirSync(path.join(worldDir, "maps"))
		.filter((f) => f.endsWith(".tmj"))
		.map((file) => {
			const tmj = JSON.parse(fs.readFileSync(path.join(worldDir, "maps", file), "utf8"));
			write(`maps/${file}`, JSON.stringify(tmj));
			const objects = (tmj.layers as { type: string; objects?: TiledObject[] }[])
				.filter((l) => l.type === "objectgroup")
				.flatMap((l) => (l.objects ?? []).map((o) => parseMapObject(o, TILE)));
			return { id: path.basename(file, ".tmj"), objects };
		});

	// The dialogue frame: a nine-slice cut from a sheet, or a drawn stand-in of the same size.
	const { frame } = config.ui;
	write("ui/frame.png", art ? await sharp(path.join(art, frame.file)).extract({ left: frame.x, top: frame.y, width: frame.width, height: frame.height }).png().toBuffer() : await placeholderFrame(frame));
	write("ui/emotes.png", await shrinkPng(art ? await sharp(path.join(art, config.ui.emotes)).png().toBuffer() : await placeholderEmotes()));
	for (const [name, sprite] of Object.entries(config.sprites)) {
		write(`ui/${name}.png`, await shrinkPng(art ? await sharp(path.join(art, sprite.file)).png().toBuffer() : await placeholderSprite(sprite)));
	}

	const font = await buildFont(app);
	write("fonts/pixel.png", font.png);
	write("fonts/pixel.xml", font.xml);

	// Ink dialogue, checked against the game's dialogue functions (fails the build on bad ids).
	const dialogue = compileDialogue(path.join(app.dir, config.paths.ink), await app.dialogueHost());
	write("dialogue/main.json", dialogue.json);
	checkMaps(maps, dialogue.knots, Object.keys(content.unlocks));

	// Placeholder builds have no music, and the game stays quiet.
	const music = art
		? await buildMusic({ tracks: content.music.tracks, musicDir: path.join(art, "music"), outDir: path.join(outDir, "music"), cacheDir: path.join(app.dir, ".assets-cache/music") })
		: {};

	const manifest = {
		mode: source.mode,
		builtAt: new Date().toISOString(),
		characters: Object.keys(content.characters),
		portraits,
		maps: maps.map((m) => m.id),
		tilesets: ["world"],
		fonts: ["pixel"],
		dialogue: dialogue.files,
		music,
	};
	write("assets.json", JSON.stringify(manifest, null, "\t") + "\n");
	console.log(
		`[assets] Built ${manifest.characters.length} characters, ${manifest.maps.length} maps, ` +
			`${manifest.tilesets.length} tilesets, ${Object.keys(music).length} music tracks (${source.mode} art) in ${Date.now() - started} ms`,
	);
}

/** Doors lead to a spawn that exists, signs and NPCs name dialogue knots, locks name unlocks. */
function checkMaps(maps: { id: string; objects: MapObject[] }[], knots: string[], unlocks: string[]) {
	const spawnsByMap = new Map(maps.map(({ id, objects }) => [id, new Set(objects.filter((o) => o.type === "spawn").map((o) => o.id))]));
	for (const { id, objects } of maps) {
		for (const obj of objects) {
			const at = `${id}: ${obj.type} at (${obj.x}, ${obj.y})`;
			if (obj.type === "door") {
				const spawns = spawnsByMap.get(obj.toMap);
				if (!spawns) throw new Error(`${at} leads to unknown map "${obj.toMap}"`);
				if (!spawns.has(obj.toSpawn)) throw new Error(`${at} leads to missing spawn "${obj.toSpawn}" on ${obj.toMap}`);
			}
			const unlock = obj.type === "door" || obj.type === "gate" ? obj.unlock : undefined;
			if (unlock !== undefined && !unlocks.includes(unlock)) throw new Error(`${at} has unknown unlock "${unlock}" (content/unlocks.json)`);
			if (obj.type === "sign" && obj.dialogue && !knots.includes(obj.dialogue)) throw new Error(`${at} uses dialogue "${obj.dialogue}", which is not a knot.`);
			if (obj.type === "npc" && !knots.includes(obj.dialogue)) {
				throw new Error(`${id}: NPC "${obj.id}" uses dialogue "${obj.dialogue}", which is not a knot. Knots: ${knots.join(", ")}`);
			}
		}
	}
}

/** A wood-rimmed parchment box in the frame's size, for placeholder builds. */
function placeholderFrame({ width, height }: { width: number; height: number }) {
	const img = new Raster(width, height);
	const edge = hex("3b2a3a");
	img.rect(1, 0, width - 2, height - 1, edge);
	img.rect(0, 1, width, height - 3, edge);
	img.rect(1, 1, width - 2, height - 4, hex("b8733d"));
	img.rect(3, 3, width - 6, height - 8, edge);
	img.rect(4, 4, width - 8, height - 10, hex("c4a888"));
	return img.toPng();
}

/** White bubbles with a coloured mark in the frames the game uses, for placeholder builds. */
function placeholderEmotes() {
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
