// A sign is placed on one tile of the thing it describes, but players read it by facing
// any part of that thing: a whiteboard two tiles wide, a vending machine, a fountain.
// Before a map is written, each sign grows to the footprint of the object under it.
import type { MapObject } from "../../game/world/objects.ts";
import type { MapCanvas, Placement } from "./canvas.ts";

type Sign = Extract<MapObject, { type: "sign" }>;

const contains = (p: Placement, x: number, y: number) => x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h;

/**
 * The cells a sign at (x, y) covers: the blocked cells of the object whose own footprint
 * holds the sign, or, for things hung on a wall (they block nothing themselves), the
 * blocked cells inside the smallest object drawn over the sign. Signs on buildings stay
 * one tile: a shut door answers when knocked, not from anywhere along the wall.
 */
function footprint(canvas: MapCanvas, sign: Sign): [number, number][] {
	const here = canvas.placed.filter((p) => contains(p, sign.x, sign.y));
	if (here.some((p) => p.door?.[0] === sign.x && p.door?.[1] === sign.y)) return [[sign.x, sign.y]];
	const owner = here.find((p) => p.blocked.some(([x, y]) => x === sign.x && y === sign.y));
	// A building (it has a door) is too big to read from every wall: its sign stays put.
	if (owner) return owner.door ? [[sign.x, sign.y]] : owner.blocked;
	const hung = here.filter((p) => p.blocked.length === 0).sort((a, b) => a.w * a.h - b.w * b.h)[0];
	if (!hung) return [[sign.x, sign.y]];
	const cells: [number, number][] = [];
	for (let y = hung.y; y < hung.y + hung.h; y++) for (let x = hung.x; x < hung.x + hung.w; x++) if (canvas.isBlocked(x, y)) cells.push([x, y]);
	return cells;
}

/** Grow every one-tile sign to the object it sits on, as a rectangle (the game reads it on the blocked cells inside). */
export function growSigns(canvas: MapCanvas): void {
	// Cells another sign, an NPC or a door already answers for stay theirs.
	const taken = new Set(canvas.objects.filter((o) => o.type === "sign" || o.type === "arcade" || o.type === "npc" || o.type === "cat" || o.type === "door").map((o) => `${o.x},${o.y}`));
	for (const obj of canvas.objects) {
		if (obj.type !== "sign" || obj.w !== undefined) continue;
		const own = `${obj.x},${obj.y}`;
		const cells = footprint(canvas, obj).filter(([x, y]) => `${x},${y}` === own || !taken.has(`${x},${y}`));
		if (cells.length <= 1) continue;
		const xs = cells.map(([x]) => x);
		const ys = cells.map(([, y]) => y);
		const x0 = Math.min(...xs);
		const y0 = Math.min(...ys);
		obj.w = Math.max(...xs) - x0 + 1;
		obj.h = Math.max(...ys) - y0 + 1;
		obj.x = x0;
		obj.y = y0;
	}
}
