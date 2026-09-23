#!/usr/bin/env node
// Generates world/maps/*.tmj from world/gen/maps (docs/game/PLAN.md M3.1). Output is
// committed; `manual_*` layers already in a map file are kept. With the private art it
// also refreshes world/tile-colors.json (placeholder colours) and world/tilesets/world.png
// (for opening maps in Tiled).
//
//   node scripts/world/gen.mjs            regenerate
//   node scripts/world/gen.mjs --check    fail if the committed maps are out of date
//   node scripts/world/gen.mjs --prune    rebuild the tile registry from scratch (only
//                                         while no map has manual layers)
//   node scripts/world/gen.mjs --render   also write world/out/<map>.png
//     [--collision] [--objects] [--grid] [--scale=N] [--only=<map>]
import fs from "node:fs";
import path from "node:path";
import { GENERATED_MAPS } from "../../world/gen/maps/index.ts";
import { TileRegistry } from "../../world/gen/registry.ts";
import { canvasToTmj, formatTmj, isManual } from "../../world/gen/tmj.ts";
import { buildAtlas, SheetCache, tileColors } from "../../world/gen/atlas.ts";
import { renderTmj } from "../../world/gen/render.ts";
import { validateMap } from "../../world/gen/validate.ts";
import { checkCuts } from "../../world/gen/cuts.ts";
import { resolveAssetSource } from "../assets/source.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const files = {
	registry: path.join(root, "world/tile-ids.json"),
	colors: path.join(root, "world/tile-colors.json"),
	maps: path.join(root, "world/maps"),
	tilesetDir: path.join(root, "world/tilesets"),
	out: path.join(root, "world/out"),
};
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);

if (flag("prune") && opt("only")) {
	console.error("[world] --prune rebuilds tile ids for every map; it can't be combined with --only.");
	process.exit(1);
}
if (flag("prune")) {
	const edited = GENERATED_MAPS.filter((m) => readJson(path.join(files.maps, `${m.id}.tmj`))?.layers.some(isManual));
	if (edited.length) {
		console.error(`[world] Can't prune: ${edited.map((m) => m.id).join(", ")} have manual layers that use today's tile ids.`);
		process.exit(1);
	}
}
const registry = new TileRegistry(flag("prune") ? undefined : (readJson(files.registry) ?? undefined));
const only = opt("only");
const outputs = new Map();
const problems = [];
for (const map of GENERATED_MAPS) {
	if (only && map.id !== only) continue;
	const file = path.join(files.maps, `${map.id}.tmj`);
	const canvas = map.build();
	const tmj = canvasToTmj(map.id, canvas, registry, { properties: map.properties, previous: readJson(file) });
	problems.push(...validateMap(map.id, tmj), ...checkCuts(map.id, canvas.stamped));
	outputs.set(file, formatTmj(tmj));
}
if (problems.length) {
	console.error(`[world] ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
	process.exit(1);
}
outputs.set(files.registry, JSON.stringify(registry.toJSON(), null, "\t") + "\n");

if (flag("check")) {
	const stale = [...outputs].filter(([file, text]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text);
	if (stale.length) {
		console.error(`[world] Out of date: ${stale.map(([f]) => path.relative(root, f)).join(", ")}. Run \`pnpm world:gen\`.`);
		process.exit(1);
	}
	console.log(`[world] ${outputs.size - 1} maps up to date`);
	process.exit(0);
}

fs.mkdirSync(files.maps, { recursive: true });
for (const [file, text] of outputs) fs.writeFileSync(file, text);

const source = resolveAssetSource({
	env: { ...process.env, ASSETS_REPO_TOKEN: undefined },
	cwd: root,
	isAssetsDir: (dir) => fs.existsSync(path.join(dir, "limezu")),
});
if (!source.dir) {
	console.log(`[world] Wrote ${outputs.size - 1} maps. No art checkout, so no colours, tileset or renders.`);
	process.exit(0);
}
const sheets = new SheetCache(source.dir);
const colors = await tileColors(registry.tiles, sheets);
fs.writeFileSync(files.colors, JSON.stringify(colors, null, "\t") + "\n");
fs.mkdirSync(files.tilesetDir, { recursive: true });
fs.writeFileSync(path.join(files.tilesetDir, "world.png"), await buildAtlas(registry.tiles, sheets));

if (flag("render")) {
	fs.mkdirSync(files.out, { recursive: true });
	for (const [file, text] of outputs) {
		if (!file.endsWith(".tmj")) continue;
		const png = await renderTmj(JSON.parse(text), registry.tiles, sheets, {
			collision: flag("collision"),
			objects: flag("objects"),
			grid: flag("grid"),
			scale: Number(opt("scale") ?? 1),
		});
		const target = path.join(files.out, path.basename(file, ".tmj") + ".png");
		fs.writeFileSync(target, png);
		console.log(`[world] Rendered ${path.relative(root, target)}`);
	}
}
console.log(`[world] Wrote ${outputs.size - 1} maps, ${registry.tiles.length} tiles registered`);
