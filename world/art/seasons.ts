// How the town changes with the seasons (PLAN M3.9). LimeZu has no snow and few seasonal
// tiles, so a seasonal tile is "<sheet>@<season>": the same tile with its greens shifted
// by the rules below and, in winter, a snow cap along the top of its roofs. Where the
// pack has seasonal art it is used instead (the camping sheet's autumn trees), and
// hand-drawn overrides in datagutt-assets `seasons/` win over all of it (atlas.ts).
import type { ChangedSeason } from "../../game/world/season.ts";
import type { TileRef } from "./autotile.ts";
import { DECALS } from "./palette.ts";
import { PREFABS } from "./prefabs.ts";

/** Sheets whose vegetation changes with the season: ground, trees, bushes, planters. */
const GREEN_SHEETS = new Set(["terrain", "camping", "campingDry", "garden", "props"]);

/** The grass colours (terrain and the grass under trees): snow in winter. */
const GRASS = new Set(["479757", "37854e", "2d7256", "53a65d", "79a15c", "46a44d"]);

/**
 * Roof colours per building sheet or single, from a survey of the town's roof tiles.
 * In winter, snow settles where the sky reaches them (roofMask, paintSnowCaps).
 */
const ROOFS: Record<string, string[]> = {
	houses: ["3a3a50", "565972", "6c6e85", "46465e", "7d7f99", "838897", "8b8bab", "9da3b7"],
	"houses#Post_Apocalyptic_House_1": ["9d433e", "a14f44", "943c3f", "a7604a", "3a3a50", "46465e"],
	post: ["8b8bab", "7d7f99", "6c6e85", "595e75", "565972", "46465e"],
	villas: ["cb2a2a", "e63f38", "d93232", "fc5c46", "a82b2d"],
	"villas#Villa_1": ["984723", "c0723b", "833026", "d08945", "9a5827", "71272b"],
	"villas#Villa_2": ["6f4a39", "7c5c46", "663731", "77573f", "5a2f31", "826c57"],
	"villas#Villa_3": ["8b3d60", "9d5a68", "703b57", "9b4865", "5d374f", "aa746e"],
	"villas#Villa_4": ["3576b0", "4d9bb9", "365892", "4eaec2", "4087b4", "273f7b"],
	"villaRed#Villa_5": ["4a4e5c", "5a5f6e", "3a3d4a", "6a7080", "43465a"],
};
export const roofsOf = (sheet: string): string[] | undefined => ROOFS[sheet] ?? ROOFS[sheet.split("#")[0]];

/**
 * Trees whose autumn version sits 26 rows further down the camping sheet: the leafy ones,
 * and one of the three conifers as larch, so the evergreen forest gets some gold in it.
 */
const AUTUMN_TREES = [PREFABS.pineMid, PREFABS.oak, PREFABS.roundTree];
const AUTUMN_TREE_ROWS = 26;

const same = (a: TileRef, b: TileRef) => a.sheet === b.sheet && a.col === b.col && a.row === b.row;
const flowers = Object.values(DECALS.flowers);
const isFlower = (ref: TileRef) => flowers.some((set) => set.some((f) => same(f, ref)));

/** In spring, grass patches and tufts bloom. */
function spring(ref: TileRef): TileRef {
	const patch = DECALS.grassPatches.findIndex((p) => same(p, ref));
	if (patch >= 0) return [DECALS.flowers.red, DECALS.flowers.yellow, DECALS.flowers.pink][patch][0];
	const tuft = DECALS.tufts.findIndex((p) => same(p, ref));
	if (tuft >= 0) return DECALS.flowers.blue[tuft % 2];
	return ref;
}

/** Whether a sheet has a seasonal version (its pixels change). */
const recoloured = (sheet: string, season: ChangedSeason) =>
	GREEN_SHEETS.has(sheet.split("#")[0]) || (season === "winter" && roofsOf(sheet) !== undefined);

/**
 * One tile (not a stack) in `season`, or null when the season clears it (flowers in
 * winter). Plain tiles keep their flip.
 */
export function seasonalTile(ref: TileRef, season: ChangedSeason): TileRef | null {
	if (season === "winter" && isFlower(ref)) return null;
	let out = season === "spring" ? spring(ref) : ref;
	if (season === "autumn" && out.sheet === "camping") {
		const tree = AUTUMN_TREES.find((t) => out.col >= t.col && out.col < t.col + t.w && out.row >= t.row && out.row < t.row + t.h);
		if (tree) out = { ...out, row: out.row + AUTUMN_TREE_ROWS };
	}
	if (!recoloured(out.sheet, season)) return out;
	// "villas#Villa_1" → "villas@winter#Villa_1": the season goes on the sheet id.
	const [sheet, single] = out.sheet.split("#");
	return { ...out, sheet: `${sheet}@${season}${single ? `#${single}` : ""}` };
}

type Rgb = [number, number, number];

function toHsl([r, g, b]: Rgb): Rgb {
	const [R, G, B] = [r / 255, g / 255, b / 255];
	const max = Math.max(R, G, B);
	const min = Math.min(R, G, B);
	const l = (max + min) / 2;
	const d = max - min;
	if (!d) return [0, 0, l];
	const s = d / (1 - Math.abs(2 * l - 1));
	let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
	h *= 60;
	return [h < 0 ? h + 360 : h, s, l];
}

function fromHsl([h, s, l]: Rgb): Rgb {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
	return [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v + m)) * 255)) as Rgb;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const hex = (h: string): Rgb => [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16)) as Rgb;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as Rgb;
/** Through a list of colours, t from 0 to 1. */
const ramp = (stops: Rgb[], t: number): Rgb => {
	const x = clamp01(t) * (stops.length - 1);
	const i = Math.min(stops.length - 2, Math.floor(x));
	return mix(stops[i], stops[i + 1], x - i);
};

/** Snow, shaded by how light the colour it replaces was. */
const SNOW = [hex("9aa9c9"), hex("f5f8ff")];
const snow = (l: number) => ramp(SNOW, (l - 0.25) / 0.25);
/** Snow on the ground: only a hint of the grass's light and shade. */
const GROUND_SNOW = [hex("e0e7f3"), hex("e8eef8")];
/** Autumn leaves on bushes and hedges: rust in the shadows, gold in the light. */
const LEAVES = [hex("5c2a1e"), hex("a8471f"), hex("d98a2b"), hex("ecc14a")];

/** Leaves, needles and grass: green to teal hues with some saturation. */
const isGreen = ([h, s]: Rgb) => h >= 60 && h < 180 && s >= 0.15;

const hexOf = (rgb: Rgb) => rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

export type Img = { data: Uint8Array; width: number; height: number };
/** Outline pixels: the art's near-black lines. */
export const isDark = (data: Uint8Array, i: number) => data[i] + data[i + 1] + data[i + 2] < 150;

/**
 * Where snow settles on roofs: the roof-coloured pixels seen from the sky. Each column is
 * scanned from the top; below open air, roof colours (and the dark outlines and small
 * flecks between them) are roof until something else, a wall or an eave, blocks the
 * view. Walls often share the roof's greys, so colour alone can't find the roof.
 */
export function roofMask(img: Img, sheet: string): Uint8Array | null {
	const roofs = roofsOf(sheet);
	if (!roofs) return null;
	const colours = new Set(roofs);
	const { data, width, height } = img;
	const mask = new Uint8Array(width * height);
	const at = (x: number, y: number) => (y * width + x) * 4;
	const isRoof = (i: number) => colours.has(hexOf([data[i], data[i + 1], data[i + 2]]));
	const isOutline = (i: number) => isDark(data, i);
	/**
	 * Other pixels allowed above a roof (ridge caps, a flat roof's parapet) and inside
	 * one (flecks, seams) before the view counts as blocked.
	 */
	const GAP = { sky: 12, roof: 3 };
	for (let x = 0; x < width; x++) {
		let state: "sky" | "roof" | "blocked" = "sky";
		let skipped = 0;
		// Roof pixels in a row; a lone roof-coloured outline doesn't start a roof yet.
		let run = 0;
		for (let y = 0; y < height; y++) {
			const i = at(x, y);
			if (data[i + 3] < 128) {
				state = "sky";
				skipped = run = 0;
				continue;
			}
			if (state === "blocked") continue;
			if (isRoof(i)) {
				mask[y * width + x] = 1;
				if (++run >= 3) state = "roof";
				skipped = 0;
			} else {
				run = 0;
				if (!isOutline(i) && ++skipped > GAP[state]) state = "blocked";
			}
		}
	}
	return mask;
}

/**
 * Snow on roofs, darkest first: cold blue-grey in shadow up to near white in the light.
 * Which shade a pixel gets follows how light the roof was there, so the sunny slope, the
 * shaded slope and the shingle rows still read through the snow.
 */
export const ROOF_SNOW = [hex("aab6d2"), hex("c3cde3"), hex("d9e1ef"), hex("edf2fa"), hex("fbfcff")];
/** The shade a snow cap casts on the roof below it. */
const CAP_SHADE = hex("7482ab");

/** How light a roof colour is among its roof's colours, 0 (darkest) to 1. */
export function roofLightness(sheet: string): (rgb: Rgb) => number {
	const ls = (roofsOf(sheet) ?? []).map((h) => toHsl(hex(h))[2]);
	const [lo, hi] = [Math.min(...ls), Math.max(...ls)];
	return (rgb) => clamp01((toHsl(rgb)[2] - lo) / Math.max(0.01, hi - lo));
}

/** The snow shade over a roof pixel: its lightness picks the shade, `lift` steps lighter. */
export function roofSnow(t: number, lift = 0): Rgb {
	return ROOF_SNOW[Math.min(ROOF_SNOW.length - 1, Math.round(t * 3) + lift)];
}

/**
 * Snow along the top of each roof, in place: a few pixels deep where the sky first meets
 * the roof in each column, deeper in clumps, with a soft shade under it. Roofs keep their
 * own colours below; full snow roofs are hand-drawn overrides.
 */
export function paintSnowCaps(img: Img, sheet: string): void {
	const mask = roofMask(img, sheet);
	if (!mask) return;
	const light = roofLightness(sheet);
	const { data, width, height } = img;
	for (let x = 0; x < width; x++) {
		// Clumps a few pixels wide, 4 to 6 pixels deep.
		const depth = 4 + (((Math.floor(x / 3) * 2654435761) >>> 0) % 3);
		let armed = true;
		for (let y = 0; y < height; y++) {
			const i = (y * width + x) * 4;
			if (data[i + 3] < 128) {
				armed = true;
				continue;
			}
			if (!armed || !mask[y * width + x]) continue;
			armed = false;
			// The top outline stays; the snow fills in under it, its top row catching the light.
			let k = 0;
			let yy = y;
			for (; yy < height && k < depth; yy++) {
				const j = (yy * width + x) * 4;
				if (data[j + 3] < 128) break;
				if (isDark(data, j) && k === 0) continue;
				[data[j], data[j + 1], data[j + 2]] = roofSnow(light([data[j], data[j + 1], data[j + 2]]), k === 0 ? 2 : 1);
				k++;
			}
			const j = (yy * width + x) * 4;
			if (yy < height && data[j + 3] >= 128 && !isDark(data, j)) {
				[data[j], data[j + 1], data[j + 2]] = mix([data[j], data[j + 1], data[j + 2]], CAP_SHADE, 0.45);
			}
		}
	}
}

/**
 * A pixel's colour in `season` on `sheet` (the sheet id before the season, single
 * included, e.g. "villas#Villa_1"), or null to leave it as it is.
 */
export function seasonalColor(rgb: Rgb, sheet: string, season: ChangedSeason): Rgb | null {
	const key = hexOf(rgb);
	const hsl = toHsl(rgb);
	const [h, s, l] = hsl;
	if (!isGreen(hsl)) return null;
	const grass = GRASS.has(key);
	switch (season) {
		case "winter":
			// Even snow on the ground (a shaded ramp would keep the grass texture, as snow
			// shaped like blades), snow on the lit side of leaves, the rest a cold dark green.
			if (grass) return ramp(GROUND_SNOW, (l - 0.31) / 0.13);
			if (l >= 0.38) return snow(l);
			return fromHsl([185, s * 0.35, l * 0.9]);
		case "autumn":
			if (grass) return fromHsl([h + (62 - h) * 0.7, s * 0.75, l + 0.02]);
			// Bushes and hedges turn; the camping sheet's trees have their own autumn art
			// (seasonalTile), and the conifers without it stay evergreen.
			if (sheet.startsWith("camping")) return null;
			return ramp(LEAVES, (l - 0.15) / 0.35);
		case "spring":
			if (grass) return fromHsl([h + (108 - h) * 0.4, s * 0.95, l + 0.03]);
			return fromHsl([h + (125 - h) * 0.35, s, l + 0.03]);
	}
}
