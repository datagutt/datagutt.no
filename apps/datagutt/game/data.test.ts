// Fjord Town's content through the engine's rules: stamps, unlocks, music and voices.
import type { Moment } from "@datagutt/kai/data";
import { describe, expect, it } from "vitest";
import { content } from "../content/index";
import { GENERATED_MAPS } from "../world/gen/maps/index";
import { fjordData } from "./data";
import { NPCS } from "./npcs";

const STAMP_PLACES = fjordData.stampPlaces;
const awardStamp = (stamps: readonly string[], place: string | null) => fjordData.awardStamp(stamps, place);
const hasAll = (stamps: string[]) => ({ hasStamp: (place: string) => stamps.includes(place) });

describe("passport", () => {
	it("has one stamp per place that presents content", () => {
		expect(STAMP_PLACES.map((p) => p.id)).toEqual(["home", "boathouse", "radio-tower", "kiosk", "office", "town-hall", "gym", "library", "farm", "post-office"]);
	});

	it("maps every stamp place to exactly one NPC who gives it", () => {
		for (const place of STAMP_PLACES) {
			expect(NPCS.filter((n) => fjordData.stampForNpc(n.id) === place.id), place.id).toHaveLength(1);
		}
		expect(fjordData.stampForNpc("ferryman")).toBeNull(); // the dock gives no stamp
	});

	it("awards each stamp once and notices a full passport", () => {
		const first = awardStamp([], "library");
		expect(first).toEqual({ stamps: ["library"], newStamp: "library", complete: false });
		expect(awardStamp(first.stamps, "library").newStamp).toBeNull();
		expect(awardStamp(first.stamps, "nowhere").newStamp).toBeNull();

		let last = awardStamp([], null);
		for (const p of STAMP_PLACES) last = awardStamp(last.stamps, p.id);
		expect(last.complete).toBe(true);
		expect(last.stamps).toHaveLength(STAMP_PLACES.length);
	});

	it("drops stamps for places that no longer exist", () => {
		expect(awardStamp(["gone", "farm"], null).stamps).toEqual(["farm"]);
	});
});

describe("unlocks", () => {
	it("opens the mountain trail only with every passport stamp", () => {
		const all = STAMP_PLACES.map((p) => p.id);
		expect(fjordData.isUnlocked("passport", hasAll(all.slice(1)))).toBe(false);
		expect(fjordData.isUnlocked("passport", hasAll(all))).toBe(true);
	});
});

describe("music by place and time", () => {
	const town: Extract<Moment, { scene: "world" }> = { scene: "world", map: "town", outdoors: true, phase: "day", season: "summer", night: false };
	const trackFor = (moment: Moment) => fjordData.trackFor(moment);
	const inside = (map: string) => trackFor({ ...town, map, outdoors: false });

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

	it("plays the night track on a story night, whatever the season", () => {
		expect(trackFor({ ...town, night: true, season: "winter" })).toBe("goodnight");
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
		for (const map of interiors) expect(content.music.tracks, map).toHaveProperty(inside(map));
	});
});

describe("the cast", () => {
	it("gives every NPC a sprite, a portrait and a voice of their own", () => {
		const recipes = content.characters;
		for (const npc of NPCS) {
			expect(recipes[npc.id], npc.id).toBeDefined();
			expect(recipes[npc.id].portrait, npc.id).not.toBe(false);
			expect(fjordData.voiceFor(npc.id), npc.id).toBe(npc.voice);
		}
		expect(fjordData.voiceFor("ferryman").pitch).not.toBe(fjordData.voiceFor("datagutt").pitch);
	});

	it("gives no two NPCs the same look", () => {
		const looks = NPCS.map((npc) => JSON.stringify(content.characters[npc.id].layers));
		expect(new Set(looks).size).toBe(looks.length);
	});
});
