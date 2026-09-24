#!/usr/bin/env bun
// The kai command line, run from a game's folder (the one with kai.json):
//
//   kai content                       check content/ and kai.json, write .kai/
//   kai assets                        fetch the art, then build public/<basePath>
//   kai world gen|check|render [...]  generate, check or render the maps (see world/gen.ts)
//   kai characters                    contact sheet of every character (world/out/)
//   kai art <tool> [...]              a tool of the art adapter, such as `catalog`
//   kai dev                           the standalone game harness with live reload
import { loadApp } from "./app.ts";
import { fetchArt } from "./art/fetch.ts";
import { localArtDir } from "./art/source.ts";
import { buildAssets } from "./build/assets.ts";
import { reviewCharacters } from "./characters/review.ts";
import { compileContent, ContentError, writeConfig, writeContent } from "./content/compile.ts";
import { loadCollections } from "./content/load.ts";
import { devHarness } from "./dev/harness.ts";
import { worldGen } from "./world/gen.ts";

const [command, ...args] = process.argv.slice(2);
const appDir = process.cwd();

const commands: Record<string, () => Promise<void>> = {
	async content() {
		const collections = await loadCollections(appDir);
		writeContent(appDir, collections, compileContent(appDir, collections));
		writeConfig(appDir, loadApp(appDir).config);
		console.log(`[content] ${Object.keys(collections).length} collections checked`);
	},
	async assets() {
		const app = loadApp(appDir);
		await fetchArt(app);
		await buildAssets(app);
	},
	async world() {
		const [mode, ...rest] = args;
		if (mode !== "gen" && mode !== "check" && mode !== "render") throw new Error("Usage: kai world <gen|check|render> [options]");
		await worldGen(loadApp(appDir), mode, rest);
	},
	async characters() {
		await reviewCharacters(loadApp(appDir));
	},
	async art() {
		const [name, ...rest] = args;
		const app = loadApp(appDir);
		const adapter = await app.adapter();
		const tool = name ? adapter.tools?.[name] : undefined;
		if (!tool) throw new Error(`Usage: kai art <${Object.keys(adapter.tools ?? {}).join("|")}> [options]`);
		await tool({ appDir, artDir: localArtDir(appDir, app.config.assets, adapter.isArtDir), args: rest });
	},
	async dev() {
		await devHarness(loadApp(appDir));
	},
};

const run = commands[command ?? ""];
if (!run) {
	console.error(`Usage: kai <${Object.keys(commands).join("|")}>`);
	process.exit(1);
}
try {
	await run();
} catch (err) {
	if (err instanceof ContentError) {
		console.error(`[content] ${err.problems.length} problem(s):\n  ${err.problems.join("\n  ")}`);
	} else {
		console.error(err instanceof Error ? err.message : err);
	}
	process.exit(1);
}
