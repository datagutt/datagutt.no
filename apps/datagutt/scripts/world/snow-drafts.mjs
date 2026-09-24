#!/usr/bin/env node
// Drafts fully snowed roofs for the town's buildings into datagutt-assets
// `seasons/winter/`, as the starting point for hand-drawn winter art (clean them up in
// Aseprite and commit them there). The world build uses whatever is in that folder over
// the automatic snow caps (@datagutt/kai-limezu source.ts). Existing files are kept: they may be
// hand-edited. Also writes world/out/snow-drafts.png, every draft side by side.
//
//   node scripts/world/snow-drafts.mjs [--force] [--only=<prefab>]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { LimeZuSheets, seasonRecolor } from "@datagutt/kai-limezu/source";
import { fullRoofMask, paintSnowRoof } from "@datagutt/kai-limezu/snowDraft";
import { PREFABS } from "../../world/gen/prefabs.ts";
import { localArtDir, SEASON_OVERRIDES } from "../assets/source.mjs";

/** The town's buildings with roofs. */
const BUILDINGS = [
	"villaOrange",
	"villaBrown",
	"villaPurple",
	"villaBlue",
	"homeVilla",
	"farmhouse",
	"boathouse",
	"office",
	"library",
	"townHall",
	"logCabin",
	"kiosk",
	"postOffice",
];

const root = process.cwd();
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const source = { dir: localArtDir(root) };
if (!source.dir) {
	console.error("[snow] Needs a local checkout of the art repository (kai.json assets.localPath).");
	process.exit(1);
}
const outDir = path.join(source.dir, SEASON_OVERRIDES, "winter");
fs.mkdirSync(outDir, { recursive: true });
const sheets = new LimeZuSheets(source.dir, { overridesDir: SEASON_OVERRIDES });
const T = 16;

const drafts = [];
for (const name of BUILDINGS.filter((b) => !only || b === only)) {
	const prefab = PREFABS[name];
	const single = prefab.sheet.includes("#");
	const base = await sheets.get(prefab.sheet);
	// Winter without caps (greens recoloured), then the whole roof snowed.
	const img = seasonRecolor(base, prefab.sheet, "winter", false);
	const mask = fullRoofMask(base, prefab.sheet);
	if (!mask) {
		console.warn(`[snow] ${name}: no roof colours for ${prefab.sheet} (@datagutt/kai-limezu seasons.ts ROOFS)`);
		continue;
	}
	paintSnowRoof(img, prefab.sheet, mask);
	const region = single
		? { left: 0, top: 0, width: img.width, height: img.height }
		: { left: prefab.col * T, top: prefab.row * T, width: prefab.w * T, height: prefab.h * T };
	const png = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } }).extract(region).png().toBuffer();
	const file = single ? `${prefab.sheet}.png` : `${prefab.sheet}@${prefab.col},${prefab.row}.png`;
	const target = path.join(outDir, file);
	drafts.push({ name, png, width: region.width, height: region.height });
	if (fs.existsSync(target) && !force) {
		console.log(`[snow] ${file}: exists, kept (--force to redraft)`);
		continue;
	}
	fs.writeFileSync(target, png);
	console.log(`[snow] ${file}: drafted (${name})`);
}

// Contact sheet for review.
const gap = 12;
let x = 0;
const height = Math.max(...drafts.map((d) => d.height));
const layers = drafts.map((d) => {
	const layer = { input: d.png, left: x, top: 0 };
	x += d.width + gap;
	return layer;
});
fs.mkdirSync(path.join(root, "world/out"), { recursive: true });
await sharp({ create: { width: Math.max(1, x), height, channels: 4, background: "#9fb0c8" } })
	.composite(layers)
	.png()
	.toFile(path.join(root, "world/out/snow-drafts.png"));
console.log(`[snow] Contact sheet: world/out/snow-drafts.png`);
