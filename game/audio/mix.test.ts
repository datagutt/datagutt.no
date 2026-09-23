import { describe, expect, it } from "vitest";
import { ambienceMix, type Surroundings } from "./mix";

const base: Surroundings = { outdoors: true, water: Infinity, forest: Infinity, fire: Infinity, dark: 0, season: "summer" };

describe("ambience mix", () => {
	it("brings in waves and gulls at the shore, birds in the forest", () => {
		const dock = ambienceMix({ ...base, water: 1 });
		expect(dock.waves).toBeGreaterThan(0.9);
		expect(dock.gulls).toBeGreaterThan(0.9);
		expect(dock.birds).toBe(0);
		const woods = ambienceMix({ ...base, forest: 0 });
		expect(woods.birds).toBe(1);
		expect(woods.waves).toBe(0);
	});

	it("goes quiet at night and in winter", () => {
		expect(ambienceMix({ ...base, forest: 0, dark: 1 }).birds).toBe(0);
		expect(ambienceMix({ ...base, water: 0, season: "winter" }).gulls).toBeCloseTo(0.3);
		expect(ambienceMix({ ...base, season: "winter" }).wind).toBeGreaterThan(ambienceMix(base).wind);
	});

	it("indoors is the room, the fire if near, and the wind faintly", () => {
		const inside = ambienceMix({ ...base, outdoors: false, water: 0, fire: 3 });
		expect(inside).toMatchObject({ room: 1, waves: 0, gulls: 0, birds: 0 });
		expect(inside.fire).toBeCloseTo(0.5);
	});
});
