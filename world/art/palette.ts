// Named terrain from the LimeZu sheets, surveyed by eye (coordinates are in tiles).
import { blockSet, seaSet, type TileRef } from "./autotile.ts";

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

/** A north–south wooden pier, three tiles wide (camping sheet), with a life ring at the end. */
export const PIER = {
	top: [t("camping", 3, 12), t("camping", 4, 12), t("camping", 6, 12)],
	body: [t("camping", 3, 13), t("camping", 4, 13), t("camping", 6, 13)],
	end: [t("camping", 3, 14), t("camping", 4, 14), t("camping", 6, 14)],
	ring: t("camping", 2, 14),
};

/** A plain wooden door (generic buildings), 1×2, for buildings drawn without one. */
export const DOOR = [t("buildings", 5, 38), t("buildings", 5, 39)];
