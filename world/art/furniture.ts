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
	chair: solid("kitchen", 4, 11, 1, 2),
	/** Staircase going up; walk up its middle column. */
	stairsUp: { sheet: "upstairs", col: 0, row: 18, w: 3, h: 4, aboveRows: 0, collision: ["#.#", "#.#", "#.#", "#.#"] },
	/** Stairs going down, seen from above: a railing on three sides around the steps. */
	stairsDown: { sheet: "upstairs", col: 0, row: 18, w: 3, h: 3, aboveRows: 0, collision: ["#.#", "#.#", "#.#"] },
	stairwellRail: { sheet: "upstairs", col: 9, row: 18, w: 3, h: 3, aboveRows: 3, collision: [] },
} satisfies Record<string, Prefab>;
