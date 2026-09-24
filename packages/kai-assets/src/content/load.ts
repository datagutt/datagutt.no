import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ENGINE_COLLECTIONS, type Collections } from "@datagutt/kai/schema";

/**
 * The engine's collections plus the game's own, which `<appDir>/content/schema.ts`
 * exports as `collections`. A game may not redefine an engine collection.
 */
export async function loadCollections(appDir: string): Promise<Collections> {
	const file = path.join(appDir, "content/schema.ts");
	const own: Collections = fs.existsSync(file) ? ((await import(pathToFileURL(file).href)).collections ?? {}) : {};
	const clash = Object.keys(own).filter((name) => name in ENGINE_COLLECTIONS);
	if (clash.length) throw new Error(`content/schema.ts redefines the engine's collections: ${clash.join(", ")}`);
	return { ...ENGINE_COLLECTIONS, ...own };
}
