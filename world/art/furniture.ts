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
} satisfies Record<string, Prefab>;
