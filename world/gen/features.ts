// Reusable pieces of landscape for map generators: plateaus, piers, forests, buildings.
import type { MapObject } from "../../game/world/objects.ts";
import { variant } from "../art/autotile.ts";
import { DECALS, DOOR, FENCE, PIER, PLATEAU } from "../art/palette.ts";
import { PREFABS, type PrefabId } from "../art/prefabs.ts";
import { seeded } from "./random.ts";
import type { MapCanvas, Prefab } from "./canvas.ts";
import { noise2, Region } from "./layout.ts";

/**
 * A rectangular raised plateau: grass top from (x, y) sized w×h, rock face below it.
 * `stairs` are columns (absolute x) where steps are cut into the face.
 */
export function plateau(c: MapCanvas, x: number, y: number, w: number, h: number, stairs: number[] = []) {
	const col = (dx: number) => (dx === 0 ? 0 : dx === w - 1 ? 2 : 1);
	for (let dx = 0; dx < w; dx++) {
		const k = col(dx);
		c.put("ground2", x + dx, y, PLATEAU.top[k]);
		// The inside of the top is left to the ground layer's textured grass.
		if (k !== 1) for (let dy = 1; dy < h - 1; dy++) c.put("ground2", x + dx, y + dy, PLATEAU.middle[k]);
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

/** A pier running south from (x, y0) to y1 inclusive, three tiles wide, walkable up to its end row. */
export function pier(c: MapCanvas, x: number, y0: number, y1: number) {
	for (let y = y0; y <= y1; y++) {
		const row = y === y1 ? PIER.end : y === y0 ? PIER.top : PIER.body;
		row.forEach((tile, dx) => {
			c.put("below", x + dx, y, tile);
			// The end row is half water under the planks: nobody stands on it.
			c.block(x + dx, y, y === y1);
		});
	}
	c.put("below", x - 1, y1 - 1, PIER.ring[0]).put("below", x - 1, y1, PIER.ring[1]);
}

/**
 * Scatter trees without overlaps (a map cell holds one tile per layer, so overlapping
 * canopies would cut each other up). A tree's trunk (bottom two rows) must sit in
 * `region`; the canopy only has to avoid other trees and may hang off the map edge.
 */
export function forest(c: MapCanvas, region: Region, seed: number, kinds: PrefabId[], density = 0.6, taken?: Region) {
	const rand = seeded(seed);
	const used = taken ?? new Region(c.width, c.height);
	const cells: [number, number][] = [];
	region.each((x, y) => cells.push([x, y]));
	for (const [x, y] of cells) {
		if (rand() > density) continue;
		const prefab: Prefab = PREFABS[kinds[Math.floor(rand() * kinds.length)]];
		// (x, y) is the trunk's top-left cell; the prefab starts above it.
		const top = y - (prefab.h - 2);
		let fits = true;
		for (let dy = 0; dy < prefab.h && fits; dy++) {
			for (let dx = 0; dx < prefab.w && fits; dx++) {
				const cx = x + dx;
				const cy = top + dy;
				const trunk = dy >= prefab.h - 2;
				if (trunk && !region.has(cx, cy)) fits = false;
				else if (c.inBounds(cx, cy) && used.has(cx, cy)) fits = false;
			}
		}
		if (!fits) continue;
		used.rect(x, top, prefab.w, prefab.h);
		c.stamp(prefab, x, top);
	}
	return used;
}

/** A rail fence around a rectangle; `gates` are cells left open. Blocks the rest. */
export function fence(c: MapCanvas, x: number, y: number, w: number, h: number, gates: [number, number][] = []) {
	const open = new Set(gates.map(([gx, gy]) => `${gx},${gy}`));
	for (let dy = 0; dy < h; dy++) {
		for (let dx = 0; dx < w; dx++) {
			const edge = dx === 0 || dy === 0 || dx === w - 1 || dy === h - 1;
			if (!edge || open.has(`${x + dx},${y + dy}`)) continue;
			const r = dy === 0 ? 0 : dy === h - 1 ? 2 : 1;
			const k = dx === 0 ? 0 : dx === w - 1 ? 2 : 1;
			c.put("below", x + dx, y + dy, FENCE[r][k]).block(x + dx, y + dy);
		}
	}
}

/**
 * A building prefab. `link` wires its door to an interior (leave it out until the
 * interior exists); `addDoor` draws a door on buildings whose art has none. Returns the
 * tile in front of the door.
 */
export function building(
	c: MapCanvas,
	id: PrefabId,
	x: number,
	y: number,
	options: { link?: { toMap: string; toSpawn: string }; addDoor?: boolean } = {},
): { x: number; y: number } {
	const prefab = PREFABS[id] as Prefab;
	c.stamp(prefab, x, y);
	if (!prefab.door) throw new Error(`Prefab ${id} has no door`);
	const door = { x: x + prefab.door[0], y: y + prefab.door[1] };
	if (options.addDoor) c.put("below", door.x, door.y - 1, DOOR[0]).put("below", door.x, door.y, DOOR[1]);
	if (options.link) c.add({ type: "door", x: door.x, y: door.y, ...options.link } satisfies MapObject);
	return { x: door.x, y: door.y + 1 };
}

export { variant };

/**
 * Ground details on open grass: soft grass patches and tufts everywhere, flowers in
 * clusters where a noise field is high. Only cells in `open` are touched.
 */
export function meadow(c: MapCanvas, open: Region, seed: number) {
	const rand = seeded(seed);
	const clusters = noise2(seed, 7);
	const colours = Object.values(DECALS.flowers);
	const colourAt = noise2(seed + 1, 11);
	open.each((x, y) => {
		const r = rand();
		const n = clusters(x, y);
		if (n > 0.62 && r < (n - 0.62) * 2.5) {
			const set = colours[Math.floor(colourAt(x, y) * colours.length) % colours.length];
			c.put("decal", x, y, set[Math.floor(rand() * set.length)]);
		} else if (r < 0.05) {
			c.put("decal", x, y, DECALS.grassPatches[Math.floor(rand() * DECALS.grassPatches.length)]);
		} else if (r < 0.075) {
			c.put("decal", x, y, DECALS.tufts[Math.floor(rand() * DECALS.tufts.length)]);
		}
	});
}

/** A readable sign: the post (or board) art, a blocked tile, and the text to show. */
export function sign(c: MapCanvas, x: number, y: number, text: string, art: "signpost" | "noticeBoard" = "noticeBoard") {
	const prefab = PREFABS[art] as Prefab;
	c.stamp(prefab, x, y - (prefab.h - 1));
	c.add({ type: "sign", x, y, text });
}
