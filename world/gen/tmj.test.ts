import { describe, expect, it } from "vitest";
import { MapCanvas } from "./canvas";
import { GENERATED_MAPS } from "./maps";
import { TileRegistry } from "./registry";
import { canvasToTmj, formatTmj, type Tmj } from "./tmj";
import { collisionOf } from "./render";

const grass = { sheet: "terrain", col: 1, row: 12 };

function small() {
	const c = new MapCanvas(4, 3);
	c.fill("ground", () => grass);
	c.block(1, 1);
	c.add({ type: "spawn", id: "start", x: 0, y: 0, facing: "down" });
	return c;
}

describe("TileRegistry", () => {
	it("keeps ids stable and appends new tiles", () => {
		const reg = new TileRegistry({ tiles: ["@collision", "@clear", "terrain:5,5"] });
		expect(reg.id({ sheet: "terrain", col: 5, row: 5 })).toBe(2);
		expect(reg.id(grass)).toBe(3);
		expect(reg.id(grass)).toBe(3);
	});

	it("refuses a registry without the reserved ids", () => {
		expect(() => new TileRegistry({ tiles: ["terrain:1,1"] })).toThrow(/reserved|must be/);
	});
});

describe("canvasToTmj", () => {
	it("writes generated layers, a hidden collision layer and objects", () => {
		const tmj = canvasToTmj("t", small(), new TileRegistry());
		expect(tmj.layers.map((l) => l.name)).toEqual(["ground", "ground2", "decal", "shade", "below", "above", "collision", "objects"]);
		expect(tmj.layers[6].visible).toBe(false);
		expect([...collisionOf(tmj)]).toEqual([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
	});

	it("keeps manual layers from the previous file, after the generated ones", () => {
		const reg = new TileRegistry();
		const first = canvasToTmj("t", small(), reg);
		const manualTiles = { name: "manual_above", type: "tilelayer", width: 4, height: 3, data: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0] };
		// Clear the generated block at (1,1) and add one at (3,2).
		const manualCollision = { name: "manual_collision", type: "tilelayer", width: 4, height: 3, data: [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1] };
		const manualObjects = { name: "manual_objects", type: "objectgroup", objects: [{ id: 1, name: "", type: "sign", x: 32, y: 0 }] };
		const edited: Tmj = { ...first, layers: [...first.layers, manualTiles, manualCollision, manualObjects] };

		const again = canvasToTmj("t", small(), reg, { previous: edited });
		expect(again.layers.map((l) => l.name)).toEqual([
			"ground", "ground2", "decal", "shade", "below", "above", "collision", "objects", "manual_above", "manual_collision", "manual_objects",
		]);
		expect(again.layers[8].data).toEqual(manualTiles.data);
		expect((again.layers[10].objects as { id: number }[])[0].id).toBe(2);
		expect([...collisionOf(again)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
	});

	it("refuses manual layers of the wrong size", () => {
		const prev = { width: 5, height: 3, layers: [{ name: "manual_x", type: "tilelayer", width: 5, height: 3, data: [] }] };
		expect(() => canvasToTmj("t", small(), new TileRegistry(), { previous: prev })).toThrow(/manual layer/);
	});
});

describe("generated maps", () => {
	it("are byte-identical across runs", () => {
		for (const map of GENERATED_MAPS) {
			const a = formatTmj(canvasToTmj(map.id, map.build(), new TileRegistry(), { properties: map.properties }));
			const b = formatTmj(canvasToTmj(map.id, map.build(), new TileRegistry(), { properties: map.properties }));
			expect(a).toBe(b);
		}
	});
});
