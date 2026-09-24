import { TileRegistry } from "@datagutt/kai-worldgen/registry";
import { canvasToTmj, formatTmj } from "@datagutt/kai-worldgen/tmj";
import { validateMap } from "@datagutt/kai-worldgen/validate";
import { describe, expect, it } from "vitest";
import { isArcadeId } from "../../../game/arcade/ids";
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

	// Map objects name arcade games as plain strings; the registry is Fjord Town's code.
	it("only place cabinets for games the arcade registry has", () => {
		for (const map of GENERATED_MAPS) {
			for (const obj of map.build().objects) if (obj.type === "arcade") expect(isArcadeId(obj.game), `${map.id}: ${obj.game}`).toBe(true);
		}
	});
});
