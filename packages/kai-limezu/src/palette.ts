// Named terrain from the LimeZu sheets, surveyed by eye (coordinates are in tiles).
import type { TileRef } from "@datagutt/kai-worldgen/autotile";
import { blockSet, seaSet } from "./blocks.ts";

const t = (sheet: string, col: number, row: number): TileRef => ({ sheet, col, row });

export const GRASS: TileRef[] = [t("terrain", 1, 12)];

export const TERRAIN = {
	dirt: blockSet({ sheet: "terrain", col: 0, row: 30 }),
	orangeDirt: blockSet({ sheet: "terrain", col: 8, row: 30 }),
	pond: blockSet({ sheet: "terrain", col: 0, row: 35 }),
	sand: blockSet({ sheet: "terrain", col: 0, row: 55 }),
	sea: seaSet("sea", "seaCorners"),
};

/** Cobblestone paving, a 2×2 repeating pattern. */
export const COBBLE = (x: number, y: number): TileRef => t("terrain", 25 + (x & 1), 9 + (y & 1));

/**
 * A raised grass plateau with a rock face below it (camping sheet): a 3-column 9-slice
 * for the top, then the cliff face rows.
 */
export const PLATEAU = {
	top: [t("camping", 19, 169), t("camping", 20, 169), t("camping", 21, 169)],
	middle: [t("camping", 19, 170), t("camping", 20, 170), t("camping", 21, 170)],
	lip: [t("camping", 19, 171), t("camping", 20, 171), t("camping", 21, 171)],
	face: [
		[t("camping", 19, 172), t("camping", 20, 172), t("camping", 21, 172)],
		[t("camping", 19, 172), t("camping", 20, 172), t("camping", 21, 172)],
		[t("camping", 19, 173), t("camping", 20, 173), t("camping", 21, 173)],
	],
	/** Earthen steps cut into the face: one for the lip, the face rows, and the foot. */
	stairs: { lip: t("camping", 21, 174), face: t("camping", 21, 175), foot: t("camping", 21, 176) },
};

/**
 * A north–south wooden pier, three tiles wide, from the camping sheet with its baked-in
 * water cleared ("campingDry"). The life ring is two tiles tall.
 */
export const PIER = {
	top: [t("campingDry", 3, 12), t("campingDry", 4, 12), t("campingDry", 6, 12)],
	body: [t("campingDry", 3, 13), t("campingDry", 4, 13), t("campingDry", 6, 13)],
	end: [t("campingDry", 3, 14), t("campingDry", 4, 14), t("campingDry", 6, 14)],
	ring: [t("campingDry", 2, 13), t("campingDry", 2, 14)],
};

/**
 * Dock trim for water indoors: a lip (pier end: plank edge and post stubs over the water)
 * with a left end, and a mooring post.
 */
export const DOCK_TRIM = {
	lipLeft: t("campingDry", 3, 14),
	lip: t("campingDry", 4, 14),
	/** A post hugging the right side of its tile, two tiles tall. */
	postRight: [t("campingDry", 0, 12), t("campingDry", 0, 13)],
};

/** A plain wooden door (generic buildings), 1×2, for buildings drawn without one. */
export const DOOR = [t("buildings", 5, 38), t("buildings", 5, 39)];

/** Ground details drawn on the decal layer: walkable, one tile each. */
export const DECALS = {
	grassPatches: [t("terrain", 25, 2), t("terrain", 26, 2), t("terrain", 27, 2)],
	tufts: [t("props", 13, 27), t("props", 14, 27), t("props", 14, 26)],
	flowers: {
		red: [t("garden", 3, 58), t("garden", 4, 58)],
		yellow: [t("garden", 9, 56), t("garden", 10, 56)],
		blue: [t("garden", 9, 60), t("garden", 10, 60)],
		pink: [t("garden", 15, 60), t("garden", 16, 60)],
	},
};

/** A rail fence as a 9-slice: [row][col] with row/col 0 = start, 1 = middle, 2 = end. */
export const FENCE: TileRef[][] = [0, 1, 2].map((r) => [0, 1, 2].map((k) => t("garden", 10 + k, 38 + r)));

/** Crop rows: growth stages of a wheat-like crop, smallest first (garden sheet). */
export const CROPS = [t("garden", 3, 56), t("garden", 9, 54), t("garden", 10, 54), t("garden", 11, 54)];
