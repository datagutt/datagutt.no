import { describe, expect, it } from "vitest";
import { parseMapObject, toTiledObject, type MapObject } from "./objects";
import { beamAlpha, glowAlpha } from "../fx/lightShapes";

const roundTrip = (obj: MapObject) => parseMapObject(toTiledObject(obj, 1, 16), 16);

describe("map objects", () => {
	it("round-trip every kind through Tiled's format", () => {
		const objects: MapObject[] = [
			{ type: "spawn", id: "a", x: 1, y: 2, facing: "up" },
			{ type: "door", x: 3, y: 4, toMap: "house", toSpawn: "entrance" },
			{ type: "sign", x: 5, y: 6, text: "Hello" },
			{ type: "spot", id: "datagutt-desk", x: 6, y: 5, facing: "up" },
			{ type: "light", shape: "glow", x: 7, y: 8, radius: 2.5, color: "ffae62", intensity: 0.5, flicker: true },
			{ type: "light", shape: "beam", x: 1, y: 1, w: 2, h: 3, color: "fff0d2", intensity: 0.4 },
			{ type: "light", shape: "beam", x: 1, y: 1, w: 2, h: 3, color: "fff0d2", intensity: 0.4, when: "day" },
			{ type: "light", shape: "glow", x: 7, y: 8, radius: 2.5, color: "ffd08a", intensity: 0.7, flicker: false, when: "night" },
		];
		for (const obj of objects) expect(roundTrip(obj)).toEqual(obj);
	});

	it("rejects lights with a bad shape", () => {
		const raw = toTiledObject({ type: "light", shape: "glow", x: 0, y: 0, radius: 1, color: "fff", intensity: 1, flicker: false }, 1, 16);
		raw.properties = raw.properties!.map((p) => (p.name === "shape" ? { ...p, value: "cone" } : p));
		expect(() => parseMapObject(raw, 16)).toThrow(/unknown shape "cone"/);
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
