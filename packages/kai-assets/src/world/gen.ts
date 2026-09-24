// `kai world`: generates world/maps/*.tmj from the game's map builders (kai.json
// `paths.maps`). Output is committed; `manual_*` layers already in a map file are kept.
// With the art it also refreshes world/tile-colors.json (placeholder colours) and
// world/tilesets/world.png (for opening maps in Tiled).
//
//   kai world gen            regenerate
//   kai world check          fail if the committed maps are out of date
//   kai world gen --prune    rebuild the tile registry from scratch (only while no map
//                            has manual layers)
//   kai world render         also write world/out/<map>.png
//     [--collision] [--objects] [--grid] [--scale=N] [--only=<map>]
//     [--season=spring|summer|autumn|winter]   outdoor maps in that season
import fs from "node:fs";
import path from "node:path";
import { applySeason, isSeason } from "@datagutt/kai/world/season";
import { buildAtlas, tileColors } from "@datagutt/kai-worldgen/atlas";
import { TileRegistry } from "@datagutt/kai-worldgen/registry";
import { renderTmj } from "@datagutt/kai-worldgen/render";
import { canvasToTmj, formatTmj, isManual, type Tmj } from "@datagutt/kai-worldgen/tmj";
import { validateMap } from "@datagutt/kai-worldgen/validate";
import type { KaiApp } from "../app.ts";
import { localArtDir, seasonOverridesDir } from "../art/source.ts";

export async function worldGen(app: KaiApp, mode: "gen" | "check" | "render", args: string[]): Promise<void> {
	const flag = (name: string) => args.includes(`--${name}`);
	const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
	const files = {
		registry: path.join(app.worldDir, "tile-ids.json"),
		colors: path.join(app.worldDir, "tile-colors.json"),
		maps: path.join(app.worldDir, "maps"),
		tilesetDir: path.join(app.worldDir, "tilesets"),
		out: path.join(app.worldDir, "out"),
	};
	const readJson = (file: string) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);
	const [adapter, maps] = await Promise.all([app.adapter(), app.maps()]);

	if (flag("prune") && opt("only")) throw new Error("[world] --prune rebuilds tile ids for every map; it can't be combined with --only.");
	if (flag("prune")) {
		const edited = maps.filter((m) => (readJson(path.join(files.maps, `${m.id}.tmj`)) as Tmj | null)?.layers.some(isManual));
		if (edited.length) throw new Error(`[world] Can't prune: ${edited.map((m) => m.id).join(", ")} have manual layers that use today's tile ids.`);
	}
	const registry = new TileRegistry(flag("prune") ? undefined : (readJson(files.registry) ?? undefined));
	const only = opt("only");
	const outputs = new Map<string, string>();
	const problems: string[] = [];
	for (const map of maps) {
		if (only && map.id !== only) continue;
		const file = path.join(files.maps, `${map.id}.tmj`);
		const canvas = map.build();
		const tmj = canvasToTmj(map.id, canvas, registry, {
			properties: { ...map.properties, ...(map.outdoor ? { outdoor: "true" } : {}) },
			previous: readJson(file),
			...(map.outdoor ? { seasonal: adapter.seasonalTile } : {}),
		});
		problems.push(...validateMap(map.id, tmj), ...adapter.checkCuts(map.id, canvas.stamped));
		outputs.set(file, formatTmj(tmj));
	}
	if (problems.length) throw new Error(`[world] ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
	outputs.set(files.registry, JSON.stringify(registry.toJSON(), null, "\t") + "\n");

	if (mode === "check") {
		const stale = [...outputs].filter(([file, text]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text);
		if (stale.length) throw new Error(`[world] Out of date: ${stale.map(([f]) => path.relative(app.dir, f)).join(", ")}. Run \`kai world gen\`.`);
		console.log(`[world] ${outputs.size - 1} maps up to date`);
		return;
	}

	fs.mkdirSync(files.maps, { recursive: true });
	for (const [file, text] of outputs) fs.writeFileSync(file, text);

	const artDir = localArtDir(app.dir, app.config.assets, adapter.isArtDir);
	if (!artDir) {
		console.log(`[world] Wrote ${outputs.size - 1} maps. No art checkout, so no colours, tileset or renders.`);
		return;
	}
	const sheets = adapter.sheets(artDir, { overridesDir: seasonOverridesDir(app.config) });
	fs.writeFileSync(files.colors, JSON.stringify(await tileColors(registry.tiles, sheets), null, "\t") + "\n");
	fs.mkdirSync(files.tilesetDir, { recursive: true });
	fs.writeFileSync(path.join(files.tilesetDir, "world.png"), await buildAtlas(registry.tiles, sheets));

	const season = opt("season") ?? "summer";
	if (!isSeason(season)) throw new Error(`[world] Unknown season "${season}"`);
	if (mode === "render") {
		fs.mkdirSync(files.out, { recursive: true });
		for (const [file, text] of outputs) {
			if (!file.endsWith(".tmj")) continue;
			const png = await renderTmj(applySeason(JSON.parse(text), season), registry.tiles, sheets, {
				collision: flag("collision"),
				objects: flag("objects"),
				grid: flag("grid"),
				scale: Number(opt("scale") ?? 1),
			});
			const target = path.join(files.out, path.basename(file, ".tmj") + (season === "summer" ? "" : `@${season}`) + ".png");
			fs.writeFileSync(target, png);
			console.log(`[world] Rendered ${path.relative(app.dir, target)}`);
		}
	}
	console.log(`[world] Wrote ${outputs.size - 1} maps, ${registry.tiles.length} tiles registered`);
}
