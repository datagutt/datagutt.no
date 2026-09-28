// Fjord Town's title strip and link-preview image, after `kai assets`: the title screen's
// waterfront (world/gen/title.ts) drawn from the same sheets as the maps, and the
// preview (og.mjs) drawn from it. Placeholder builds have no sheets to draw them from:
// the title shows its sky alone and link previews go without a picture.
import fs from "node:fs";
import path from "node:path";
import { loadApp } from "@datagutt/kai-assets/app";
import { seasonOverridesDir } from "@datagutt/kai-assets/art/source";
import { buildFont, readSource } from "@datagutt/kai-assets/build/assets";
import { shrinkPng } from "@datagutt/kai-assets/png";
import { TileRegistry } from "@datagutt/kai-worldgen/registry";
import { renderTmj } from "@datagutt/kai-worldgen/render";
import { canvasToTmj } from "@datagutt/kai-worldgen/tmj";
import { titleScene } from "../world/gen/title.ts";
import { buildOgImage } from "./og.mjs";

const app = loadApp(process.cwd());
const source = readSource(app);
fs.rmSync(path.join(app.outDir, "og.png"), { force: true });
if (source.dir) {
	const tiles = new TileRegistry(JSON.parse(fs.readFileSync(path.join(app.worldDir, "tile-ids.json"), "utf8")));
	const tmj = canvasToTmj("title", titleScene(), tiles);
	const sheets = (await app.adapter()).sheets(source.dir, { overridesDir: seasonOverridesDir(app.config) });
	const waterfront = await renderTmj(tmj, tiles.tiles, sheets);
	fs.writeFileSync(path.join(app.outDir, "ui/title.png"), await shrinkPng(waterfront));
	fs.writeFileSync(path.join(app.outDir, "og.png"), await shrinkPng(await buildOgImage(waterfront, await buildFont(app))));
	console.log("[title] Drew the title strip and the link preview");
}
