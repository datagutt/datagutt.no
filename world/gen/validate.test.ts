import { describe, expect, it } from "vitest";
import { MapCanvas } from "./canvas";
import { GENERATED_MAPS } from "./maps";
import { TileRegistry } from "./registry";
import { canvasToTmj } from "./tmj";
import { validateMap } from "./validate";

describe("validateMap", () => {
	it("passes every generated map", () => {
		for (const map of GENERATED_MAPS) expect(validateMap(map.id, canvasToTmj(map.id, map.build(), new TileRegistry()))).toEqual([]);
	});

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
});
