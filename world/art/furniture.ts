// Furniture and indoor props from the LimeZu Interiors theme sheets (PLAN M3.8).
// Most block their whole footprint; rugs are flat and walkable.
import type { Prefab } from "../gen/canvas.ts";

const solid = (sheet: string, col: number, row: number, w: number, h: number, aboveRows = 0): Prefab => ({ sheet, col, row, w, h, aboveRows });
const flat = (sheet: string, col: number, row: number, w: number, h: number): Prefab => ({ sheet, col, row, w, h, aboveRows: 0, flat: true, collision: [] });

export const FURNITURE = {
	bed: solid("bedroom", 12, 20, 2, 4),
	pcDesk: solid("classroom", 7, 10, 2, 3),
	fridge: solid("classroom", 12, 5, 1, 2),
	sofa: solid("living", 1, 28, 3, 2),
	bookcase: solid("living", 10, 24, 2, 3),
	fireplace: solid("living", 4, 24, 2, 3),
	plant: solid("generic", 6, 57, 1, 2),
	scaleModel: solid("bedroom", 9, 18, 2, 2),
	rug: flat("generic", 9, 7, 4, 3),
	doormat: flat("generic", 0, 44, 3, 2),
	/** Wooden window; the sheet draws it straddling tile edges, so it sits mid-wall. */
	window: flat("generic", 10, 43, 2, 2),
	stove: solid("kitchen", 8, 11, 2, 2),
	/** A wooden table drawn across the middle of a 4×3 block. */
	table: { sheet: "generic", col: 0, row: 5, w: 4, h: 3, aboveRows: 0, collision: [".##.", ".##."] },
	/** Kitchen chairs drawn from the side: one faces right, the other left. */
	chairFacingRight: solid("kitchen", 7, 11, 1, 2),
	chairFacingLeft: solid("kitchen", 4, 13, 1, 2),
	/** A low cabinet with a fruit bowl: the kitchen counter. */
	counter: solid("living", 0, 11, 3, 2),
	tvCabinet: solid("living", 5, 15, 2, 2),
	palm: solid("living", 13, 21, 2, 3),
	/**
	 * A flat TV standing on its cabinet: the top row hangs on the wall (below the wall-top
	 * border), the bottom row draws over the cabinet's top.
	 */
	tv: { sheet: "bedroom", col: 9, row: 12, w: 2, h: 2, aboveRows: 0, collision: [], rowLayers: ["below", "above"] },
	/** Side-view sofas (a matching pair); each sprite sits to one side of its 2×4 block. */
	sofaFacingRight: { sheet: "living", col: 9, row: 32, w: 2, h: 4, aboveRows: 0, collision: ["#.", "#.", "#."] },
	sofaFacingLeft: { sheet: "living", col: 7, row: 32, w: 2, h: 4, aboveRows: 0, collision: [".#", ".#", ".#"] },
	/** One long desk with three computers side by side. */
	deskTriple: solid("classroom", 3, 10, 4, 3),
	bedHeadboard: solid("bedroom", 9, 0, 2, 4),
	dresser: solid("bedroom", 12, 9, 3, 3),
	/** Window with grey-blue curtains, drawn straddling tile edges. */
	curtainWindow: flat("generic", 8, 45, 3, 3),
	shelf: solid("classroom", 4, 13, 2, 3),
	plantTall: solid("living", 12, 0, 1, 3),

	// Boathouse studio: TV-studio and fishing sets.
	greenScreen: solid("studio", 0, 4, 3, 4),
	/** A softbox light on a stand, head turned left; mirror it for the other side. */
	softbox: solid("studio", 8, 0, 2, 3),
	studioCamera: solid("studio", 3, 0, 1, 2),
	wallMonitor: flat("studio", 10, 1, 3, 2),
	onAirLamp: solid("studio", 14, 1, 1, 2),
	armchair: solid("studio", 5, 3, 2, 2),
	/** The long front of a green studio desk (Guac green). */
	guacDesk: solid("studio", 3, 12, 4, 2),
	tackleBoxBlue: solid("fishing", 0, 4, 2, 2),
	tackleBoxYellow: solid("fishing", 0, 6, 2, 2),
	rodRack: solid("fishing", 7, 12, 2, 3),
	crate: solid("fishing", 4, 5, 2, 2),
	// Library.
	/** A long bookcase seen end-on: stand several in a row to make aisles. */
	aisleShelf: solid("classroom", 12, 22, 1, 4),
	globe: solid("classroom", 13, 1, 1, 2),
	/** A reception desk seen from the front; talk across it. */
	receptionDesk: solid("conference", 0, 4, 5, 1),
	chairDarkRight: solid("kitchen", 5, 11, 1, 2),
	chairDarkLeft: solid("kitchen", 6, 13, 1, 2),

	// Kiosk (grocery sheet).
	drinksCooler: solid("grocery", 6, 16, 2, 3),
	steelFridge: solid("grocery", 12, 34, 2, 3),
	bakeryRack: solid("grocery", 7, 34, 2, 2),
	productShelf: solid("grocery", 0, 15, 2, 3),
	displayCounter: solid("grocery", 11, 40, 5, 2),
	checkout: solid("grocery", 6, 24, 3, 2),
	openSign: flat("grocery", 1, 49, 1, 2),

	// Post office (post office exterior sheet, plus a counter and a noticeboard).
	parcelCage: solid("post", 8, 11, 4, 2),
	parcelStack: solid("post", 5, 13, 2, 2),
	parcels: solid("post", 3, 13, 2, 2),
	redLetterBox: solid("post", 8, 13, 1, 2),
	serviceCounter: solid("grocery", 13, 40, 3, 2),
	noticeboard: flat("classroom", 0, 6, 2, 1),
	writingDesk: solid("classroom", 5, 3, 2, 2),

	// Gym (gym sheet), plus a wooden front desk.
	dumbbellRack: solid("gym", 0, 14, 3, 2),
	warmupRack: solid("gym", 8, 25, 2, 2),
	barbellRack: solid("gym", 11, 4, 4, 2),
	treadmill: solid("gym", 11, 8, 3, 4),
	powerRack: solid("gym", 13, 25, 2, 4),
	weightPlates: solid("gym", 9, 23, 2, 2),
	weightBench: solid("gym", 11, 1, 2, 3),
	punchingBag: solid("gym", 6, 0, 1, 3),
	mirrorWall: flat("gym", 4, 21, 3, 2),
	gymMat: flat("gym", 0, 1, 3, 3),
	frontDesk: solid("conference", 8, 4, 5, 2),

	// Radio hut (outdoor radio gear from the houses sheet works indoors too).
	transceiver: solid("houses", 24, 268, 3, 2),
	transceiverAntenna: solid("houses", 24, 270, 3, 3),
	transmitter: solid("houses", 27, 267, 2, 3),
	retroPc: solid("classroom", 1, 10, 2, 2),
	pcTower: solid("classroom", 0, 10, 1, 2),
	signalScreens: flat("studio", 10, 3, 5, 2),

	// Farmhouse.
	farmTable: solid("kitchen", 3, 15, 3, 3),
	chairRedRight: solid("kitchen", 4, 11, 1, 2),
	chairRedLeft: solid("kitchen", 7, 13, 1, 2),
	kitchenCounter: solid("kitchen", 2, 8, 6, 1),
	bakingOven: solid("grocery", 9, 35, 2, 3),
	redCurtainWindow: flat("generic", 5, 45, 3, 3),
	sideboard: solid("living", 5, 11, 3, 2),
	crates: solid("grocery", 1, 61, 3, 2),
	roundRug: flat("bedroom", 0, 22, 3, 2),
	pottedTree: solid("generic", 8, 56, 2, 3),

	/** A rowboat seen from above, bow up; it floats, so it doesn't block (the water does). */
	rowboatUp: { sheet: "camping", col: 2, row: 31, w: 2, h: 4, aboveRows: 0, collision: [] },
	/** Staircase going up; walk up its middle column. */
	stairsUp: { sheet: "upstairs", col: 0, row: 18, w: 3, h: 4, aboveRows: 0, collision: ["#.#", "#.#", "#.#", "#.#"] },
	/** Stairs going down, seen from above: a railing on three sides around the steps. */
	stairsDown: { sheet: "upstairs", col: 0, row: 18, w: 3, h: 3, aboveRows: 0, collision: ["#.#", "#.#", "#.#"] },
	stairwellRail: { sheet: "upstairs", col: 9, row: 18, w: 3, h: 3, aboveRows: 3, collision: [] },
} satisfies Record<string, Prefab>;

/**
 * Library bookcases against a wall, three tiles tall: 3 or 2 wide (two 2-wide designs),
 * in three woods (the classroom sheet's rows 13, 16 and 19).
 */
export function bookcase(kind: "wide" | "narrow" | "narrow2", wood: 0 | 1 | 2 = 0): Prefab {
	const col = { wide: 0, narrow: 4, narrow2: 6 }[kind];
	return solid("classroom", col, 13 + wood * 3, kind === "wide" ? 3 : 2, 3);
}
