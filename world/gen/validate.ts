// Map checks run on every generation (docs/game/PLAN.md M3.6): catches NPCs in walls,
// signs nobody can reach, blocked doors and stacked objects.
import { parseMapObject, type MapObject, type TiledObject } from "../../game/world/objects.ts";
import { collisionOf } from "./render.ts";
import type { Tmj } from "./tmj.ts";

const T = 16;
const NEIGHBOURS = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
];

export function validateMap(id: string, tmj: Tmj): string[] {
	const blocked = collisionOf(tmj);
	const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < tmj.width && y < tmj.height;
	const walkable = (x: number, y: number) => inside(x, y) && blocked[y * tmj.width + x] === 0;
	const objects: MapObject[] = tmj.layers
		.filter((l) => l.type === "objectgroup")
		.flatMap((l) => (l.objects as TiledObject[]).map((o) => parseMapObject(o, T)));
	const problems: string[] = [];
	const at = new Map<string, MapObject>();
	// A spot counts as taken: the NPC who goes there may be standing on it.
	const occupied = new Set(objects.filter((o) => o.type === "npc" || o.type === "cat" || o.type === "sign" || o.type === "arcade" || o.type === "spot").map((o) => `${o.x},${o.y}`));
	const reachableFrom = (o: MapObject) =>
		cellsOf(o, walkable).some(([x, y]) => NEIGHBOURS.some(([dx, dy]) => walkable(x + dx, y + dy) && !occupied.has(`${x + dx},${y + dy}`)));

	for (const o of objects) {
		if (o.type === "light" || o.type === "crops" || o.type === "books" || o.type === "area" || o.type === "gate") continue; // areas and lights overlap other things
		const where = `${id}: ${o.type} ${"id" in o ? `"${o.id}" ` : ""}at (${o.x}, ${o.y})`;
		const key = `${o.x},${o.y}`;
		const other = at.get(key);
		if (other) problems.push(`${where} shares its tile with a ${other.type}`);
		at.set(key, o);
		if (!inside(o.x, o.y)) problems.push(`${where} is outside the map`);
		else if ((o.type === "spawn" || o.type === "npc" || o.type === "cat" || o.type === "door") && !walkable(o.x, o.y)) {
			problems.push(`${where} is on a blocked tile`);
		} else if (o.type === "cat" && !walkable(o.x + 1, o.y)) {
			problems.push(`${where} lies across a blocked tile east of it`);
		}
		if ((o.type === "sign" || o.type === "arcade") && !reachableFrom(o)) problems.push(`${where} can't be reached from any side`);
		// A sign is read from next to it, so it must sit on something solid, not open floor.
		if ((o.type === "sign" || o.type === "arcade") && cellsOf(o, walkable).every(([x, y]) => walkable(x, y))) problems.push(`${where} is on open floor; put it on the thing it describes`);
		if (o.type === "door" && !walkable(o.x, o.y + 1)) problems.push(`${where} has a blocked tile in front of it`);
	}
	// A gate opens one day, so what lies behind it counts as reachable.
	const gates = objects.filter((o): o is Extract<MapObject, { type: "gate" }> => o.type === "gate");
	const passable = (x: number, y: number) => walkable(x, y) || gates.some((g) => x >= g.x && y >= g.y && x < g.x + g.w && y < g.y + g.h);
	problems.push(...checkReachable(id, tmj, objects, passable, occupied));
	return problems;
}

/** The tiles an object answers on: a grown sign's blocked tiles, or its one tile. */
function cellsOf(o: MapObject, walkable: (x: number, y: number) => boolean): [number, number][] {
	if (o.type !== "sign" || o.w === undefined || o.h === undefined) return [[o.x, o.y]];
	const cells: [number, number][] = [];
	for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (!walkable(x, y)) cells.push([x, y]);
	return cells.length ? cells : [[o.x, o.y]];
}

/**
 * Everything must be reachable on foot from where players arrive (the entrance, or the
 * ferry in town): doors and spawns themselves, signs from a neighbouring tile, NPCs from
 * a neighbour or across up to two tiles of counter (as WorldScene talks across counters).
 */
function checkReachable(
	id: string,
	tmj: Tmj,
	objects: MapObject[],
	walkable: (x: number, y: number) => boolean,
	occupied: Set<string>,
): string[] {
	const spawns = objects.filter((o): o is Extract<MapObject, { type: "spawn" }> => o.type === "spawn");
	const start = spawns.find((s) => s.id === "entrance") ?? spawns.find((s) => s.id === "ferry") ?? spawns[0];
	if (!start) return [];
	const open = (x: number, y: number) => walkable(x, y) && !occupied.has(`${x},${y}`);
	const seen = new Set<string>([`${start.x},${start.y}`]);
	const queue = [[start.x, start.y]];
	while (queue.length) {
		const [x, y] = queue.shift()!;
		for (const [dx, dy] of NEIGHBOURS) {
			const nx = x + dx;
			const ny = y + dy;
			const key = `${nx},${ny}`;
			if (seen.has(key) || !open(nx, ny)) continue;
			seen.add(key);
			queue.push([nx, ny]);
		}
	}
	const reached = (x: number, y: number) => seen.has(`${x},${y}`);
	const fromSide = (o: MapObject) => cellsOf(o, walkable).some(([x, y]) => NEIGHBOURS.some(([dx, dy]) => reached(x + dx, y + dy)));
	const acrossCounter = (o: MapObject) =>
		NEIGHBOURS.some(([dx, dy]) => [2, 3].some((d) => reached(o.x + dx * d, o.y + dy * d) && !walkable(o.x + dx, o.y + dy)));
	const problems: string[] = [];
	for (const o of objects) {
		if (o.type === "light" || o.type === "crops" || o.type === "books" || o.type === "area" || o.type === "gate") continue;
		const where = `${id}: ${o.type} ${"id" in o ? `"${o.id}" ` : ""}at (${o.x}, ${o.y})`;
		const ok =
			o.type === "door" || o.type === "spawn"
				? reached(o.x, o.y)
				: o.type === "npc" || o.type === "cat" || o.type === "spot"
					? fromSide(o) || acrossCounter(o)
					: fromSide(o);
		if (!ok) problems.push(`${where} can't be reached from ${start.id}`);
	}
	return problems;
}
