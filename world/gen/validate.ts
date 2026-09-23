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
	const occupied = new Set(objects.filter((o) => o.type === "npc" || o.type === "sign").map((o) => `${o.x},${o.y}`));
	const reachableFrom = (o: MapObject) =>
		NEIGHBOURS.some(([dx, dy]) => walkable(o.x + dx, o.y + dy) && !occupied.has(`${o.x + dx},${o.y + dy}`));

	for (const o of objects) {
		if (o.type === "light") continue; // lights sit anywhere, on top of other things
		const where = `${id}: ${o.type} ${"id" in o ? `"${o.id}" ` : ""}at (${o.x}, ${o.y})`;
		const key = `${o.x},${o.y}`;
		const other = at.get(key);
		if (other) problems.push(`${where} shares its tile with a ${other.type}`);
		at.set(key, o);
		if (!inside(o.x, o.y)) problems.push(`${where} is outside the map`);
		else if ((o.type === "spawn" || o.type === "npc" || o.type === "door") && !walkable(o.x, o.y)) {
			problems.push(`${where} is on a blocked tile`);
		}
		if ((o.type === "sign" || o.type === "npc") && !reachableFrom(o)) problems.push(`${where} can't be reached from any side`);
		if (o.type === "door" && !walkable(o.x, o.y + 1)) problems.push(`${where} has a blocked tile in front of it`);
	}
	return problems;
}
