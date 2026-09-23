// Multi-tile pieces cut from the LimeZu sheets: buildings, trees and props (PLAN M3.3).
// Coordinates are the top-left tile in the sheet; see world/gen/canvas.ts for the fields.
import type { Prefab } from "../gen/canvas.ts";
import { single } from "./singles.ts";

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
			"#.......",
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
	boathouse: { sheet: "houses", col: 16, row: 250, w: 15, h: 14, aboveRows: 3, door: [5, 13] },
	/** Farmhouse: white board-and-batten house whose garage reads as barn doors. */
	farmhouse: { sheet: "houses", col: 0, row: 250, w: 16, h: 14, aboveRows: 3, door: [9, 13] },
	/** Red-roofed log cabin: the gym. */
	logCabin: single("houses", "Post_Apocalyptic_House_1", { aboveRows: 2, door: [7, 8], collision: [...Array(7).fill("#".repeat(12)), "."] }),
	windmill: single("houses", "Post_Apocalyptic_House_Wind_Mill", { aboveRows: 5, collision: [".##."] }),
	/** LimeZu calls it a windmill without its propeller: a lattice tower. */
	radioTower: single("houses", "Post_Apocalyptic_House_Wind_Mill_No_Propeller", { aboveRows: 5, collision: [".##."] }),
	/** The sheet stacks a second storey under the cottage; take only the top one. */
	kiosk: { sheet: "villas", col: 23, row: 14, w: 4, h: 5, aboveRows: 2, door: [2, 4] },
	office: { sheet: "houses", col: 0, row: 83, w: 10, h: 16, aboveRows: 3, door: [3, 14], collision: [...Array(12).fill("#".repeat(10)), "."] },
	postOffice: { sheet: "post", col: 16, row: 4, w: 8, h: 13, aboveRows: 2, door: [4, 12] },
	townHall: { sheet: "houses", col: 0, row: 208, w: 18, h: 22, aboveRows: 3, door: [3, 21] },
	library: { sheet: "houses", col: 19, row: 208, w: 12, h: 22, aboveRows: 3, door: [6, 21] },

	hut: { sheet: "garden", col: 17, row: 38, w: 3, h: 4, aboveRows: 2, door: [1, 3] },
	rowboat: single("vehicles", "Boat_1_Right_1", { collision: [] }),
	ferry: single("vehicles", "Boat_3_Right_1", { collision: [] }),
	/** A small wooden board on a post: building name signs. */
	signpost: { sheet: "camping", col: 19, row: 16, w: 1, h: 1, aboveRows: 0 },
	/** A notice board with a paper on it: the welcome sign at the dock. */
	noticeBoard: { sheet: "camping", col: 18, row: 12, w: 1, h: 2, aboveRows: 1 },
	lamp: { sheet: "props", col: 20, row: 0, w: 1, h: 4, aboveRows: 3 },
	parkLamp: { sheet: "props", col: 1, row: 28, w: 3, h: 4, aboveRows: 3, collision: [".#."] },
	bench: { sheet: "props", col: 21, row: 0, w: 2, h: 2, aboveRows: 0 },
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
