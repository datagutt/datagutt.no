import { describe, expect, it } from "vitest";
import { defineMapObject, mapObjectTypes, parseMapObject, toTiledObject, type LightObject, type MapObject } from "./objects.ts";
import { beamAlpha, glowAlpha } from "../fx/lightShapes.ts";

const roundTrip = (obj: MapObject) => parseMapObject(toTiledObject(obj, 1, 16), 16);

describe("map objects", () => {
	it("round-trip every kind through Tiled's format", () => {
		const objects: MapObject[] = [
			{ type: "spawn", id: "a", x: 1, y: 2, facing: "up" },
			{ type: "door", x: 3, y: 4, toMap: "house", toSpawn: "entrance" },
			{ type: "sign", x: 5, y: 6, text: "Hello" },
			{ type: "spot", id: "datagutt-desk", x: 6, y: 5, facing: "up" },
			{ type: "area", id: "ferry", x: 52, y: 67, w: 6, h: 4 },
			{ type: "light", shape: "glow", x: 7, y: 8, radius: 2.5, color: "ffae62", intensity: 0.5, flicker: true },
			{ type: "light", shape: "beam", x: 1, y: 1, w: 2, h: 3, color: "fff0d2", intensity: 0.4 },
			{ type: "light", shape: "beam", x: 1, y: 1, w: 2, h: 3, color: "fff0d2", intensity: 0.4, when: "day" },
			{ type: "light", shape: "glow", x: 7, y: 8, radius: 2.5, color: "ffd08a", intensity: 0.7, flicker: false, when: "night" },
		];
		for (const obj of objects) expect(roundTrip(obj)).toEqual(obj);
	});

	it("rejects lights with a bad shape", () => {
		const light: LightObject = { type: "light", shape: "glow", x: 0, y: 0, radius: 1, color: "fff", intensity: 1, flicker: false };
		const raw = toTiledObject(light, 1, 16);
		raw.properties = raw.properties!.map((p) => (p.name === "shape" ? { ...p, value: "cone" } : p));
		expect(() => parseMapObject(raw, 16)).toThrow(/unknown shape "cone"/);
	});
});

describe("a game's own map object types", () => {
	const cabinet = defineMapObject("cabinet", { props: { game: "string", label: "string?" }, placement: "fixture" });
	const field = defineMapObject("field", { props: { stages: "tiles" }, placement: "overlay", size: "rect" });
	const types = mapObjectTypes([cabinet, field]);

	it("round-trip through Tiled's format, a rectangle keeping its size as the object's", () => {
		for (const obj of [cabinet.at(3, 4, { game: "blocks" }), cabinet.at(1, 1, { game: "life", label: "Life" }), field.at(2, 2, { w: 4, h: 3, stages: "1,2" })]) {
			expect(parseMapObject(toTiledObject(obj, 1, 16, types), 16, types)).toEqual(obj);
		}
		expect(toTiledObject(field.at(2, 2, { w: 4, h: 3, stages: "1,2" }), 1, 16, types)).toMatchObject({ width: 64, height: 48 });
	});

	it("are unknown until the game lists them", () => {
		expect(() => toTiledObject(cabinet.at(0, 0, { game: "blocks" }), 1, 16)).toThrow(/Unknown map object type "cabinet"/);
	});

	it("can't take a name another type has", () => {
		expect(() => mapObjectTypes([defineMapObject("sign", { placement: "fixture" })])).toThrow(/Two map object types are called "sign"/);
	});

	it("say what a missing property is", () => {
		const raw = toTiledObject(cabinet.at(0, 0, { game: "blocks" }), 1, 16, types);
		raw.properties = [];
		expect(() => parseMapObject(raw, 16, types)).toThrow(/cabinet object 1 needs a "game" string property/);
	});
});

describe("light shapes", () => {
	it("glow is brightest in the middle and gone at the rim", () => {
		expect(glowAlpha(0, 0)).toBe(1);
		expect(glowAlpha(0.5, 0)).toBeGreaterThan(0);
		expect(glowAlpha(1, 0)).toBe(0);
	});

	it("beam fades toward the bottom", () => {
		expect(beamAlpha(0.45, 0.1)).toBeGreaterThan(beamAlpha(0.45, 0.8));
		expect(beamAlpha(0.45, 1)).toBe(0);
	});
});
