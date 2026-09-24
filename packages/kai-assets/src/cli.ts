#!/usr/bin/env bun
// The kai command line, run from a game's folder:
//
//   kai content   check content/ against its schemas and write the .kai/ bundle
import { compileContent, ContentError, writeContent } from "./content/compile.ts";
import { loadCollections } from "./content/load.ts";

const [command] = process.argv.slice(2);
const appDir = process.cwd();

async function content() {
	const collections = await loadCollections(appDir);
	const compiled = compileContent(appDir, collections);
	writeContent(appDir, collections, compiled);
	console.log(`[content] ${Object.keys(collections).length} collections checked`);
}

const commands: Record<string, () => Promise<void>> = { content };

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
