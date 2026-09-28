// What an art adapter (such as @datagutt/kai-limezu) gives the build: tile pixels, the
// seasonal tile rule, checks on how prefabs are cut, character composition, and tools of
// its own. kai.json `assets.adapter` names the module; it exports `adapter`.
import type { CharacterRecipe } from "@datagutt/kai/schema/engine";
import type { SheetSource } from "@datagutt/kai-worldgen/atlas";
import type { Prefab } from "@datagutt/kai-worldgen/canvas";
import type { SeasonalTiles } from "@datagutt/kai-worldgen/tmj";

export type ArtTool = (ctx: { appDir: string; artDir: string | null; args: string[] }) => Promise<void>;

export type ArtAdapter = {
	/** Whether `dir` holds the art this adapter reads (a checkout of the art repository). */
	isArtDir(dir: string): boolean;
	sheets(artDir: string, options: { overridesDir: string }): SheetSource;
	seasonalTile: SeasonalTiles;
	/** Problems with how a map's stamped prefabs are cut from their sheets. */
	checkCuts(mapId: string, stamped: Prefab[]): string[];
	/** A character's walk sheet in the runtime's sheet layout. */
	character(artDir: string, id: string, recipe: CharacterRecipe): Promise<Buffer>;
	/** A character's dialogue portrait, or null when the recipe has none. */
	portrait(artDir: string, id: string, recipe: CharacterRecipe): Promise<Buffer | null>;
	/** Tools run with `kai art <name>`, such as rebuilding a sheet catalogue. */
	tools?: Record<string, ArtTool>;
};
