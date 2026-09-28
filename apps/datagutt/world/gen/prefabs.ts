// Fjord Town's own buildings, cut from the LimeZu sheets and named for what they are in
// town, beside the generic pieces of @datagutt/kai-limezu. Map builders use PREFABS.
import type { Prefab } from "@datagutt/kai-worldgen/canvas";
import { PREFABS as LIMEZU_PREFABS, footprint, villa } from "@datagutt/kai-limezu/prefabs";
import { single } from "@datagutt/kai-limezu/singles";

/** LimeZu calls it a windmill without its propeller: a lattice tower. */
const latticeTower = single("houses", "Post_Apocalyptic_House_Wind_Mill_No_Propeller", { aboveRows: 5, collision: [".##."] });

const TOWN_PREFABS = {
	/** datagutt's house: the red villa in falu red with a slate roof. */
	homeVilla: villa("Villa_5", "villaRed"),

	/** Boathouse studio: a corrugated wooden workshop with an awning. */
	boathouse: footprint({ sheet: "houses", col: 16, row: 250, w: 15, h: 14, aboveRows: 3, door: [5, 13] }),
	/** Farmhouse: white board-and-batten house whose garage reads as barn doors. */
	farmhouse: footprint({ sheet: "houses", col: 0, row: 250, w: 16, h: 14, aboveRows: 3, door: [9, 13] }),
	radioTower: latticeTower,
	/**
	 * The windmill without its blades, which turn over it as a sprite (kai.json
	 * `windmill-blades`). The tower stays tiles, so it keeps its snow in winter.
	 */
	windmillTower: latticeTower,
	/** The sheet stacks a second storey under the cottage; take only the top one. */
	kiosk: footprint({ sheet: "villas", col: 23, row: 14, w: 4, h: 5, aboveRows: 2, door: [2, 4] }),
	office: footprint({ sheet: "houses", col: 0, row: 83, w: 10, h: 16, aboveRows: 3, door: [2, 14] }),
	postOffice: footprint({ sheet: "post", col: 16, row: 4, w: 8, h: 13, aboveRows: 2, door: [4, 12] }),
	townHall: footprint({ sheet: "houses", col: 0, row: 208, w: 18, h: 22, aboveRows: 3, door: [3, 21] }),
	library: footprint({ sheet: "houses", col: 19, row: 208, w: 12, h: 22, aboveRows: 3, door: [6, 21] }),
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
	/** The hytte up the mountain trail: a red log cabin, the gym's sister. */
	hytte: footprint(single("houses", "Post_Apocalyptic_House_2", { aboveRows: 2, door: [7, 8] })),
} satisfies Record<string, Prefab>;

export const PREFABS = { ...LIMEZU_PREFABS, ...TOWN_PREFABS };
export type PrefabId = keyof typeof PREFABS;
