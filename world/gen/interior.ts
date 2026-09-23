// Interior rooms from LimeZu's Room Builder (docs/game/PLAN.md M3.8): a two-tile wall
// face along the top, a patterned floor, a thin wall-top border ringing the room and
// black void outside it. Doors are gaps in the bottom border.
import type { TileRef } from "../art/autotile.ts";
import type { MapCanvas } from "./canvas.ts";

const t = (sheet: string, col: number, row: number): TileRef => ({ sheet, col, row });

/** A wall style: the top-left of a 3×2 group in Room_Builder_Walls (row 0 top, row 1 base). */
export type WallStyle = { col: number; row: number };
/** A floor style: the top-left of a 3×2 group in Room_Builder_Floors. */
export type FloorStyle = { col: number; row: number };

export const WALLS = {
	woodPanel: { col: 11, row: 0 },
	cream: { col: 0, row: 16 },
	brick: { col: 11, row: 16 },
	stone: { col: 0, row: 30 },
	blueGrey: { col: 22, row: 8 },
	darkPlanks: { col: 11, row: 14 },
} satisfies Record<string, WallStyle>;

export const FLOORS = {
	oak: { col: 4, row: 12 },
	pine: { col: 0, row: 12 },
	parquet: { col: 0, row: 10 },
	tiles: { col: 8, row: 28 },
	concrete: { col: 12, row: 14 },
	darkWood: { col: 12, row: 26 },
	boards: { col: 4, row: 22 },
} satisfies Record<string, FloorStyle>;

// The thin wall-top border as a 9-slice (combined Room Builder sheet).
const BORDER = {
	tl: t("roomBuilder", 11, 1),
	t: t("roomBuilder", 12, 1),
	tr: t("roomBuilder", 13, 1),
	l: t("roomBuilder", 11, 2),
	r: t("roomBuilder", 13, 2),
	bl: t("roomBuilder", 11, 3),
	b: t("roomBuilder", 12, 3),
	br: t("roomBuilder", 13, 3),
};

export type Room = { x: number; y: number; w: number; h: number };

/**
 * A room whose wall face starts at (x, y), `w` wide and `h` tall including the two
 * wall rows. Returns the floor rectangle.
 */
export function room(c: MapCanvas, r: Room, style: { wall: WallStyle; floor: FloorStyle }): Room {
	const { x, y, w, h } = r;
	for (let dx = 0; dx < w; dx++) {
		for (let dy = 0; dy < 2; dy++) {
			c.put("ground", x + dx, y + dy, t("rbWalls", style.wall.col + ((x + dx) % 3), style.wall.row + dy)).block(x + dx, y + dy);
		}
		for (let dy = 2; dy < h; dy++) {
			c.put("ground", x + dx, y + dy, t("rbFloors", style.floor.col + ((x + dx) % 3), style.floor.row + ((y + dy) % 2)));
		}
	}
	// The border: over the top wall row, down both sides, and along the bottom.
	c.put("above", x - 1, y, BORDER.tl).put("above", x + w, y, BORDER.tr);
	for (let dx = 0; dx < w; dx++) c.put("above", x + dx, y, BORDER.t).put("above", x + dx, y + h, BORDER.b).block(x + dx, y + h);
	for (let dy = 1; dy < h; dy++) c.put("above", x - 1, y + dy, BORDER.l).put("above", x + w, y + dy, BORDER.r);
	c.put("above", x - 1, y + h, BORDER.bl).put("above", x + w, y + h, BORDER.br);
	for (let dy = 0; dy <= h; dy++) c.block(x - 1, y + dy).block(x + w, y + dy);
	return { x, y: y + 2, w, h: h - 2 };
}

/** A way out through the bottom border at column `x`: the gap tile is the door. */
export function exitDoor(c: MapCanvas, r: Room, x: number, to: { toMap: string; toSpawn: string }) {
	const y = r.y + r.h;
	c.put("above", x, y, null).block(x, y, false);
	c.add({ type: "door", x, y, ...to });
	c.add({ type: "spawn", id: "entrance", x, y: y - 1, facing: "up" });
}
