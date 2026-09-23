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
