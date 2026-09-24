import { TileRegistry } from "@datagutt/kai-worldgen/registry";
import { canvasToTmj, formatTmj } from "@datagutt/kai-worldgen/tmj";
import { validateMap } from "@datagutt/kai-worldgen/validate";
import { describe, expect, it } from "vitest";
import { isArcadeId } from "../../../game/arcade/ids";
import { content } from "../../../content/index";
import { usedMapText } from "../text";
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

	it("use every text in content/mapText.json, and name every map", () => {
		for (const map of GENERATED_MAPS) map.build();
		const all = Object.entries(content.mapText.signs).flatMap(([map, texts]) => Object.keys(texts).map((key) => `${map}.${key}`));
		expect(all.filter((key) => !usedMapText().has(key))).toEqual([]);
		for (const map of GENERATED_MAPS) expect(map.properties?.name, map.id).toBeTruthy();
	});

	it("have a spot for each of Thomas's places, on its map, and doors along his routes", () => {
		const { presence } = content;
		const built = new Map(GENERATED_MAPS.map((m) => [m.id, m.build()]));
		for (const [place, { map }] of Object.entries(presence.places)) {
			const spots = built.get(map)!.objects.filter((o) => o.type === "spot" && o.id === `${presence.npc}-${place}`);
			expect(spots, `${presence.npc}-${place} on ${map}`).toHaveLength(1);
		}
		for (const [from, tos] of Object.entries(presence.routes)) {
			for (const to of tos) expect(built.get(from)!.objects.some((o) => o.type === "door" && o.toMap === to), `door ${from} → ${to}`).toBe(true);
		}
	});
});
