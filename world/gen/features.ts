// Reusable pieces of landscape for map generators: plateaus, piers, forests, buildings.
import type { MapObject } from "../../game/world/objects.ts";
import { variant } from "../art/autotile.ts";
import { DOOR, PIER, PLATEAU } from "../art/palette.ts";
import { PREFABS, type PrefabId } from "../art/prefabs.ts";
import { seeded } from "../grid.ts";
import type { MapCanvas, Prefab } from "./canvas.ts";
import { Region } from "./layout.ts";

/**
 * A rectangular raised plateau: grass top from (x, y) sized w×h, rock face below it.
 * `stairs` are columns (absolute x) where steps are cut into the face.
 */
export function plateau(c: MapCanvas, x: number, y: number, w: number, h: number, stairs: number[] = []) {
	const col = (dx: number) => (dx === 0 ? 0 : dx === w - 1 ? 2 : 1);
	for (let dx = 0; dx < w; dx++) {
		const k = col(dx);
		c.put("ground2", x + dx, y, PLATEAU.top[k]);
		for (let dy = 1; dy < h - 1; dy++) c.put("ground2", x + dx, y + dy, PLATEAU.middle[k]);
		c.put("ground2", x + dx, y + h - 1, PLATEAU.lip[k]);
		PLATEAU.face.forEach((row, i) => {
			c.put("ground2", x + dx, y + h + i, row[k]);
			c.block(x + dx, y + h + i);
		});
		// The lip is the edge of the drop.
		c.block(x + dx, y + h - 1);
	}
	for (let dy = 0; dy < h; dy++) c.block(x, y + dy).block(x + w - 1, y + dy);
	const faceRows = PLATEAU.face.length;
	for (const sx of stairs) {
		c.put("ground2", sx, y + h - 1, PLATEAU.stairs.lip).block(sx, y + h - 1, false);
		for (let i = 0; i < faceRows; i++) {
			c.put("ground2", sx, y + h + i, i === faceRows - 1 ? PLATEAU.stairs.foot : PLATEAU.stairs.face).block(sx, y + h + i, false);
		}
	}
}

/** A pier running south from (x, y0) to y1 inclusive, three tiles wide, walkable. */
export function pier(c: MapCanvas, x: number, y0: number, y1: number) {
	for (let y = y0; y <= y1; y++) {
		const row = y === y1 ? PIER.end : y === y0 ? PIER.top : PIER.body;
		row.forEach((tile, dx) => {
			c.put("below", x + dx, y, tile);
			c.block(x + dx, y, false);
		});
	}
	c.put("below", x - 1, y1, PIER.ring);
}

/**
 * Scatter trees over a region without overlaps. Each tree's footprint (its whole prefab)
 * must fit inside the region and not touch cells already taken.
 */
export function forest(c: MapCanvas, region: Region, seed: number, kinds: PrefabId[], density = 0.6, taken?: Region) {
	const rand = seeded(seed);
	const used = taken ?? new Region(c.width, c.height);
	const cells: [number, number][] = [];
	region.each((x, y) => cells.push([x, y]));
	for (const [x, y] of cells) {
		if (rand() > density) continue;
		const prefab: Prefab = PREFABS[kinds[Math.floor(rand() * kinds.length)]];
		let fits = true;
		for (let dy = 0; dy < prefab.h && fits; dy++) {
			for (let dx = 0; dx < prefab.w && fits; dx++) {
				if (!region.has(x + dx, y + dy) || used.has(x + dx, y + dy)) fits = false;
			}
		}
		if (!fits) continue;
		// Canopies may overlap the next tree's top a little; trunks may not.
		used.rect(x, y + prefab.h - 2, prefab.w, 2);
		c.stamp(prefab, x, y);
	}
	return used;
}

/**
 * A building prefab with its door wired to an interior. `addDoor` draws a door on
 * buildings whose art has none. Returns the tile in front of the door.
 */
export function building(
	c: MapCanvas,
	id: PrefabId,
	x: number,
	y: number,
	link?: { toMap: string; toSpawn: string; addDoor?: boolean },
): { x: number; y: number } {
	const prefab = PREFABS[id] as Prefab;
	c.stamp(prefab, x, y);
	if (!prefab.door) throw new Error(`Prefab ${id} has no door`);
	const door = { x: x + prefab.door[0], y: y + prefab.door[1] };
	if (link?.addDoor) {
		c.put("below", door.x, door.y - 1, DOOR[0]).put("below", door.x, door.y, DOOR[1]);
	}
	if (link) c.add({ type: "door", x: door.x, y: door.y, toMap: link.toMap, toSpawn: link.toSpawn } satisfies MapObject);
	return { x: door.x, y: door.y + 1 };
}

export { variant };
