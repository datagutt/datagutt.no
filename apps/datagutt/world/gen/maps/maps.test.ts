import { TileRegistry } from "@datagutt/kai-worldgen/registry";
import { canvasToTmj, formatTmj } from "@datagutt/kai-worldgen/tmj";
import { validateMap } from "@datagutt/kai-worldgen/validate";
import { describe, expect, it } from "vitest";
import { GENERATED_MAPS } from "./index";

describe("generated maps", () => {
	it("are byte-identical across runs", () => {
		for (const map of GENERATED_MAPS) {
			const a = formatTmj(canvasToTmj(map.id, map.build(), new TileRegistry(), { properties: map.properties }));
			const b = formatTmj(canvasToTmj(map.id, map.build(), new TileRegistry(), { properties: map.properties }));
			expect(a).toBe(b);
		}
	});

	it("pass validation", () => {
		for (const map of GENERATED_MAPS) expect(validateMap(map.id, canvasToTmj(map.id, map.build(), new TileRegistry()))).toEqual([]);
	});
});
