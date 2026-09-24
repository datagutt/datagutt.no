import { describe, expect, it } from "vitest";
import { GENERATED_MAPS } from "../../world/gen/maps/index";
import { MUSIC } from "../assets/manifest";
import { trackFor, type Moment } from "./playlist";

const town: Extract<Moment, { scene: "world" }> = { scene: "world", map: "town", outdoors: true, phase: "day", season: "summer", finale: false };
const inside = (map: string) => trackFor({ ...town, map, outdoors: false });

describe("music by place and time", () => {
	it("plays the main theme on the title and under the credits", () => {
		expect(trackFor({ scene: "title" })).toBe("welcome");
		expect(trackFor({ scene: "credits" })).toBe("welcome");
	});

	it("follows the clock in town, crossing over when night falls and at dawn", () => {
		expect(trackFor(town)).toBe("sunrise");
		expect(trackFor({ ...town, phase: "dawn" })).toBe("sunrise");
		expect(trackFor({ ...town, phase: "dusk" })).toBe("sunrise");
		expect(trackFor({ ...town, phase: "night" })).toBe("goodnight");
	});

	it("snows in the town on winter days, and keeps the night track on winter nights", () => {
		expect(trackFor({ ...town, season: "winter" })).toBe("snowedIn");
		expect(trackFor({ ...town, season: "winter", phase: "night" })).toBe("goodnight");
		expect(trackFor({ ...town, season: "autumn" })).toBe("sunrise");
	});

	it("plays the night track for the finale, whatever the season", () => {
		expect(trackFor({ ...town, finale: true, season: "winter" })).toBe("goodnight");
	});

	it("gives each room its mood, day or night", () => {
		expect(inside("house")).toBe("market");
		expect(inside("kiosk")).toBe("market");
		expect(inside("office")).toBe("taxOffice");
		expect(inside("town-hall-basement")).toBe("taxOffice");
		expect(inside("library")).toBe("boredom");
		expect(trackFor({ ...town, map: "library", outdoors: false, phase: "night", season: "winter" })).toBe("boredom");
		expect(inside("somewhere-new")).toBe("market");
	});

	it("plays a track that exists in every interior map", () => {
		const interiors = GENERATED_MAPS.filter((m) => !m.outdoor).map((m) => m.id);
		for (const map of interiors) expect(MUSIC, map).toHaveProperty(inside(map));
	});
});
