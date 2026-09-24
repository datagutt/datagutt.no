import { defineMapObject, mapObjectTypes } from "@datagutt/kai/world/objects";
import { describe, expect, it } from "vitest";
import { MapCanvas } from "./canvas.ts";
import { TileRegistry } from "./registry.ts";
import { canvasToTmj } from "./tmj.ts";
import { validateMap } from "./validate.ts";

describe("validateMap", () => {

	it("reports NPCs in walls, walled-in signs and stacked objects", () => {
		const c = new MapCanvas(5, 5);
		for (let x = 0; x < 5; x++) c.block(x, 0).block(x, 2);
		c.block(0, 1).block(2, 1);
		c.add({ type: "npc", id: "a", character: "a", x: 3, y: 0, facing: "down", name: "A", dialogue: "a" });
		c.add({ type: "sign", x: 1, y: 1, text: "boxed in" });
		c.add({ type: "spawn", id: "s", x: 4, y: 4, facing: "up" });
		c.add({ type: "sign", x: 4, y: 4, text: "on the spawn" });
		const problems = validateMap("t", canvasToTmj("t", c, new TileRegistry())).join("\n");
		expect(problems).toMatch(/npc "a" at \(3, 0\) is on a blocked tile/);
		expect(problems).toMatch(/sign at \(1, 1\) can't be reached/);
		expect(problems).toMatch(/sign at \(4, 4\) shares its tile/);
	});

	it("reports things walled off from where players arrive, and signs on open floor", () => {
		const c = new MapCanvas(7, 3);
		for (let y = 0; y < 3; y++) c.block(3, y); // a wall down the middle
		c.block(5, 0);
		c.add({ type: "spawn", id: "entrance", x: 1, y: 1, facing: "up" });
		c.add({ type: "npc", id: "far", character: "far", x: 5, y: 2, facing: "down", name: "Far", dialogue: "far" });
		c.add({ type: "sign", x: 0, y: 0, text: "on the floor" });
		c.add({ type: "sign", x: 5, y: 0, text: "behind the wall" });
		const problems = validateMap("t", canvasToTmj("t", c, new TileRegistry())).join("\n");
		expect(problems).toMatch(/npc "far" at \(5, 2\) can't be reached from entrance/);
		expect(problems).toMatch(/sign at \(5, 0\) can't be reached from entrance/);
		expect(problems).toMatch(/sign at \(0, 0\) is on open floor/);
	});

	it("checks a game's own types by their placement", () => {
		const cat = defineMapObject("cat", { placement: "standing", size: { w: 2, h: 1 } });
		const cabinet = defineMapObject("cabinet", { props: { game: "string" }, placement: "fixture" });
		const types = mapObjectTypes([cat, cabinet]);
		const c = new MapCanvas(6, 3);
		c.block(3, 0).block(5, 1);
		c.add({ type: "spawn", id: "entrance", x: 0, y: 1, facing: "up" });
		c.add(cat.at(2, 0, {}));
		c.add(cabinet.at(0, 0, { game: "blocks" }));
		c.add(cabinet.at(5, 1, { game: "life" }));
		const problems = validateMap("t", canvasToTmj("t", c, new TileRegistry(), { types }), types).join("\n");
		expect(problems).toMatch(/cat at \(2, 0\) reaches onto a blocked tile at \(3, 0\)/);
		expect(problems).toMatch(/cabinet at \(0, 0\) is on open floor/);
		expect(problems).not.toMatch(/cabinet at \(5, 1\)/);
	});
});
