// Map checks run on every generation (apps/datagutt/docs/PLAN.md M3.6): catches NPCs in walls,
// signs nobody can reach, blocked doors and stacked objects. What is checked follows each
// object type's placement (@datagutt/kai/world/objects), so a game's own types are checked
// like the engine's.
import {
	doorObject,
	footprintOf,
	gateObject,
	mapObjectTypes,
	parseMapObject,
	signObject,
	spawnObject,
	spotObject,
	type AnyMapObject,
	type MapObjectType,
	type MapObjectTypes,
	type TiledObject,
} from "@datagutt/kai/world/objects";
import { collisionOf } from "./render.ts";
import type { Tmj } from "./tmj.ts";

const T = 16;
const NEIGHBOURS = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
];

type Placed = { obj: AnyMapObject; type: MapObjectType };

export function validateMap(id: string, tmj: Tmj, types: MapObjectTypes = mapObjectTypes()): string[] {
	const blocked = collisionOf(tmj);
	const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < tmj.width && y < tmj.height;
	const walkable = (x: number, y: number) => inside(x, y) && blocked[y * tmj.width + x] === 0;
	const objects: Placed[] = tmj.layers
		.filter((l) => l.type === "objectgroup")
		.flatMap((l) => (l.objects as TiledObject[]).map((o) => parseMapObject(o, T, types)))
		.map((obj) => ({ obj, type: types.get(obj.type)! }));
	const problems: string[] = [];
	const at = new Map<string, AnyMapObject>();
	// Someone standing or a fixture takes its tiles. A spot counts as taken: the NPC who
	// goes there may be standing on it.
	const occupied = new Set(
		objects
			.filter(({ obj, type }) => type.placement === "standing" || type.placement === "fixture" || spotObject.is(obj))
			.flatMap(({ obj, type }) => footprintOf(obj, type).map(([x, y]) => `${x},${y}`)),
	);
	const reachableFrom = (o: AnyMapObject) =>
		cellsOf(o, walkable).some(([x, y]) => NEIGHBOURS.some(([dx, dy]) => walkable(x + dx, y + dy) && !occupied.has(`${x + dx},${y + dy}`)));

	for (const { obj: o, type } of objects) {
		if (type.placement === "overlay") continue; // areas and lights overlap other things
		const where = describe(id, o);
		const key = `${o.x},${o.y}`;
		const other = at.get(key);
		if (other) problems.push(`${where} shares its tile with a ${other.type}`);
		at.set(key, o);
		if (!inside(o.x, o.y)) problems.push(`${where} is outside the map`);
		else if (type.placement === "standing") {
			const [[x0, y0], ...rest] = footprintOf(o, type);
			if (!walkable(x0, y0)) problems.push(`${where} is on a blocked tile`);
			else for (const [x, y] of rest) if (!walkable(x, y)) problems.push(`${where} reaches onto a blocked tile at (${x}, ${y})`);
		} else if ((spawnObject.is(o) || doorObject.is(o)) && !walkable(o.x, o.y)) {
			problems.push(`${where} is on a blocked tile`);
		}
		if (type.placement === "fixture") {
			if (!reachableFrom(o)) problems.push(`${where} can't be reached from any side`);
			// A fixture is used from next to it, so it must sit on something solid, not open floor.
			if (cellsOf(o, walkable).every(([x, y]) => walkable(x, y))) problems.push(`${where} is on open floor; put it on the thing it describes`);
		}
		if (doorObject.is(o) && !walkable(o.x, o.y + 1)) problems.push(`${where} has a blocked tile in front of it`);
	}
	// A gate opens one day, so what lies behind it counts as reachable.
	const gates = objects.map(({ obj }) => obj).filter(gateObject.is);
	const passable = (x: number, y: number) => walkable(x, y) || gates.some((g) => x >= g.x && y >= g.y && x < g.x + g.w && y < g.y + g.h);
	problems.push(...checkReachable(id, objects, passable, occupied));
	return problems;
}

const describe = (id: string, o: AnyMapObject) => `${id}: ${o.type} ${"id" in o ? `"${String(o.id)}" ` : ""}at (${o.x}, ${o.y})`;

/** The tiles an object answers on: a grown sign's blocked tiles, or its one tile. */
function cellsOf(o: AnyMapObject, walkable: (x: number, y: number) => boolean): [number, number][] {
	if (!signObject.is(o) || o.w === undefined || o.h === undefined) return [[o.x, o.y]];
	const cells: [number, number][] = [];
	for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (!walkable(x, y)) cells.push([x, y]);
	return cells.length ? cells : [[o.x, o.y]];
}

/**
 * Everything must be reachable on foot from where players arrive (the entrance, or the
 * ferry in town): doors and spawns themselves, fixtures from a neighbouring tile, those
 * standing (and spots) from a neighbour or across up to two tiles of counter (as
 * WorldScene talks across counters).
 */
function checkReachable(id: string, objects: Placed[], walkable: (x: number, y: number) => boolean, occupied: Set<string>): string[] {
	const spawns = objects.map(({ obj }) => obj).filter(spawnObject.is);
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
	const fromSide = (o: AnyMapObject) => cellsOf(o, walkable).some(([x, y]) => NEIGHBOURS.some(([dx, dy]) => reached(x + dx, y + dy)));
	const acrossCounter = (o: AnyMapObject) =>
		NEIGHBOURS.some(([dx, dy]) => [2, 3].some((d) => reached(o.x + dx * d, o.y + dy * d) && !walkable(o.x + dx, o.y + dy)));
	const problems: string[] = [];
	for (const { obj: o, type } of objects) {
		if (type.placement === "overlay") continue;
		const ok =
			doorObject.is(o) || spawnObject.is(o)
				? reached(o.x, o.y)
				: type.placement === "standing" || spotObject.is(o)
					? fromSide(o) || acrossCounter(o)
					: fromSide(o);
		if (!ok) problems.push(`${describe(id, o)} can't be reached from ${start.id}`);
	}
	return problems;
}
