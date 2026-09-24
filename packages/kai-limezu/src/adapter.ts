// The LimeZu art adapter for the kai build (kai.json `assets.adapter`): the art lives
// under limezu/ in the art repository, characters and portraits from LimeZu's generators.
import fs from "node:fs";
import path from "node:path";
import type { ArtAdapter } from "@datagutt/kai-assets/adapter";
import { composeCharacter, composePortrait } from "./characters.ts";
import { checkCuts } from "./cuts.ts";
import { seasonalTile } from "./seasons.ts";
import { LimeZuSheets } from "./source.ts";
import { catalogTool } from "./tools/catalog.mjs";

const characters = (artDir: string) => path.join(artDir, "limezu/characters");
const portraits = (artDir: string) => path.join(artDir, "limezu/portraits");

export const adapter: ArtAdapter = {
	isArtDir: (dir) => fs.existsSync(path.join(dir, "limezu")),
	sheets: (artDir, { overridesDir }) => new LimeZuSheets(artDir, { overridesDir }),
	seasonalTile,
	checkCuts,
	character: (artDir, id, recipe) => composeCharacter(characters(artDir), id, recipe),
	portrait: (artDir, id, recipe) =>
		recipe.portrait === false ? Promise.resolve(null) : composePortrait(portraits(artDir), id, recipe, (file) => fs.existsSync(path.join(portraits(artDir), file))),
	tools: { catalog: catalogTool },
};
