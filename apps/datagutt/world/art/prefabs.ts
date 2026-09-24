// Multi-tile pieces cut from the LimeZu sheets: buildings, trees and props (PLAN M3.3).
// Coordinates are the top-left tile in the sheet; see world/gen/canvas.ts for the fields.
import type { Prefab } from "../gen/canvas.ts";
import { sheetCoverage, single } from "./singles.ts";

/**
 * A building blocks its whole body: every row from its first to its last solid tile
 * (catalogue coverage), so windows and ragged wall ends don't let anyone in, while the
 * baked drop shadow, which is translucent and never solid, stays walkable. The door's
 * column stays open below the door for steps.
 */
function footprint(prefab: Prefab): Prefab {
	const coverage = prefab.coverage ?? sheetCoverage(prefab.sheet, prefab.col, prefab.row, prefab.w, prefab.h);
	if (!coverage) return prefab;
	const collision = coverage
		.split("/")
		.map((row, dy) => {
			const first = row.indexOf("#");
			if (first < 0) return ".".repeat(prefab.w);
			const last = row.lastIndexOf("#");
			const filled = ".".repeat(first) + "#".repeat(last - first + 1) + ".".repeat(prefab.w - last - 1);
			if (!prefab.door || dy <= prefab.door[1]) return filled;
			return filled.slice(0, prefab.door[0]) + "." + filled.slice(prefab.door[0] + 1);
		})
		.slice(prefab.aboveRows);
	return { ...prefab, collision };
}

/** A villa (7_Villas singles "Villa_1".."Villa_5"): 9×13 with its shadow, door at (2,10). */
function villa(key: string, sheet: "villas" | "villaRed" = "villas"): Prefab {
	return single(sheet, key, {
		aboveRows: 2,
		collision: [
			"########", // roof
			"########",
			"########",
			"########",
			"########", // upper floor
			"########",
			"########",
			"########", // porch roof
			"########", // door row
			"#......#", // porch deck, railings at the sides
			"#...####", // the steps, then the bench along the porch
		],
		door: [2, 10],
	});
}

export const PREFABS = {
	villaOrange: villa("Villa_1"),
	villaBrown: villa("Villa_2"),
	villaPurple: villa("Villa_3"),
	villaRed: villa("Villa_5"),
	villaBlue: villa("Villa_4"),
	/** datagutt's house: the red villa in falu red with a slate roof. */
	homeVilla: villa("Villa_5", "villaRed"),

	/** Boathouse studio: a corrugated wooden workshop with an awning. */
	boathouse: footprint({ sheet: "houses", col: 16, row: 250, w: 15, h: 14, aboveRows: 3, door: [5, 13] }),
	/** Farmhouse: white board-and-batten house whose garage reads as barn doors. */
	farmhouse: footprint({ sheet: "houses", col: 0, row: 250, w: 16, h: 14, aboveRows: 3, door: [9, 13] }),
	/** Red-roofed log cabin: the gym. */
	logCabin: footprint(single("houses", "Post_Apocalyptic_House_1", { aboveRows: 2, door: [8, 8] })),
	windmill: single("houses", "Post_Apocalyptic_House_Wind_Mill", { aboveRows: 5, collision: [".##."] }),
	/** LimeZu calls it a windmill without its propeller: a lattice tower. */
	radioTower: single("houses", "Post_Apocalyptic_House_Wind_Mill_No_Propeller", { aboveRows: 5, collision: [".##."] }),
	/** The sheet stacks a second storey under the cottage; take only the top one. */
	kiosk: footprint({ sheet: "villas", col: 23, row: 14, w: 4, h: 5, aboveRows: 2, door: [2, 4] }),
	office: footprint({ sheet: "houses", col: 0, row: 83, w: 10, h: 16, aboveRows: 3, door: [2, 14] }),
	postOffice: footprint({ sheet: "post", col: 16, row: 4, w: 8, h: 13, aboveRows: 2, door: [4, 12] }),
	townHall: footprint({ sheet: "houses", col: 0, row: 208, w: 18, h: 22, aboveRows: 3, door: [3, 21] }),
	library: footprint({ sheet: "houses", col: 19, row: 208, w: 12, h: 22, aboveRows: 3, door: [6, 21] }),

	hut: footprint({ sheet: "garden", col: 17, row: 38, w: 3, h: 4, aboveRows: 2, door: [1, 3] }),
	/**
	 * The youth club: a white site cabin on wheels, as Norwegian ungdomsklubber often are.
	 * A small deck in front of the door, railed at the front and left; its steps come down
	 * the right-hand side.
	 */
	youthClub: single("camping", "Mobile_House_Big_5", {
		aboveRows: 2,
		door: [2, 4],
		collision: [
			"#########.",
			"#########.",
			"##########", // the door row (the door itself stays open)
			"##..######", // the deck, under the eaves
			".#........", // the deck and, right of it, the steps down to the grass
			".###......", // the front railing
		],
	}),
	rowboat: single("vehicles", "Boat_1_Right_1", { collision: [] }),
	ferry: single("vehicles", "Boat_3_Right_1", { collision: [] }),
	/** A small wooden board on a post: building name signs. */
	signpost: { sheet: "camping", col: 19, row: 16, w: 1, h: 1, aboveRows: 0 },
	/** A notice board with a paper on it: the welcome sign at the dock. */
	noticeBoard: { sheet: "camping", col: 18, row: 12, w: 1, h: 2, aboveRows: 1 },
	lamp: { sheet: "props", col: 20, row: 0, w: 1, h: 4, aboveRows: 3 },
	parkLamp: { sheet: "props", col: 1, row: 28, w: 3, h: 4, aboveRows: 3, collision: [".#."] },
	bench: { sheet: "props", col: 21, row: 0, w: 2, h: 2, aboveRows: 0 },
	/** The hytte up the mountain trail (B6): a red log cabin, the gym's sister. */
	hytte: footprint(single("houses", "Post_Apocalyptic_House_2", { aboveRows: 2, door: [7, 8] })),
	/** Red-and-white worksite barriers, one post each: left end, middle, right end. */
	barrierLeft: single("worksite", "Fence_2_1"),
	barrierMid: single("worksite", "Fence_2_2"),
	barrierRight: single("worksite", "Fence_2_5"),
	/** Loose rocks: the rockfall on the trail, and scatter up the mountain. */
	rockSmall: single("camping", "Rock_2"),
	rock: single("camping", "Rock_3"),
	rockLong: single("camping", "Rock_7"),
	rockBig: single("camping", "Rock_8"),
	/** A pair of binoculars, left lying about (on the radio hill's bench). */
	binoculars: single("camping", "Binoculars_1", { collision: [] }),
	benchLong: { sheet: "props", col: 21, row: 2, w: 3, h: 2, aboveRows: 0 },
	fountain: { sheet: "props", col: 11, row: 28, w: 2, h: 3, aboveRows: 1 },
	bigFountain: { sheet: "garden", col: 12, row: 16, w: 4, h: 5, aboveRows: 1 },
	planter: single("props", "Shrub_11"),

	pineSmall: { sheet: "camping", col: 16, row: 114, w: 2, h: 3, aboveRows: 2 },
	pineMid: { sheet: "camping", col: 18, row: 113, w: 2, h: 4, aboveRows: 3 },
	pineTall: { sheet: "camping", col: 20, row: 113, w: 2, h: 4, aboveRows: 3 },
	oak: { sheet: "camping", col: 0, row: 116, w: 4, h: 4, aboveRows: 3, collision: [".##."] },
	roundTree: { sheet: "camping", col: 8, row: 105, w: 4, h: 4, aboveRows: 3, collision: [".##."] },
} satisfies Record<string, Prefab>;

export type PrefabId = keyof typeof PREFABS;
