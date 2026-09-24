// A game as the build sees it: its folder, its validated kai.json, and the modules kai.json
// points at (the art adapter, the maps, the dialogue host), loaded on demand.
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadKaiConfig, type KaiConfig } from "@datagutt/kai/schema";
import type { GeneratedMap } from "@datagutt/kai-worldgen/maps";
import type { ArtAdapter } from "./adapter.ts";
import type { DialogueHost } from "./build/ink.ts";

export type KaiApp = {
	dir: string;
	config: KaiConfig;
	/** Where the built assets go: public/ plus the base path. */
	outDir: string;
	/** The folder the tile registry, the generated maps and the renders live in. */
	worldDir: string;
	adapter(): Promise<ArtAdapter>;
	maps(): Promise<GeneratedMap[]>;
	dialogueHost(): Promise<DialogueHost>;
};

async function importFrom<T>(file: string, name: string): Promise<T> {
	const mod = await import(pathToFileURL(file).href);
	if (!(name in mod)) throw new Error(`${file} does not export \`${name}\``);
	return mod[name] as T;
}

export function loadApp(dir: string): KaiApp {
	const config = loadKaiConfig(dir);
	const local = (rel: string) => path.join(dir, rel);
	return {
		dir,
		config,
		outDir: path.join(dir, "public", config.basePath),
		worldDir: local("world"),
		adapter: () => importFrom(createRequire(local("package.json")).resolve(config.assets.adapter), "adapter"),
		maps: () => importFrom(local(config.paths.maps), "GENERATED_MAPS"),
		dialogueHost: () => importFrom(local(config.paths.dialogueHost), "dialogueHost"),
	};
}
