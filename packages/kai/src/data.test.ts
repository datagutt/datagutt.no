import { describe, expect, it } from "vitest";
import { DEFAULT_VOICE, GameData, type GameContent } from "./data.ts";

const voice = { wave: "sine" as const, pitch: 300, variance: 0, volume: 0.1, every: 2 };
const data = new GameData({
	places: [
		{ id: "dock", name: "Dock", stamp: false, entrance: { map: "town", spawn: "ferry" } },
		{ id: "shop", name: "Shop", stamp: true, entrance: { map: "town", spawn: "shop_door" } },
		{ id: "hall", name: "Hall", stamp: true },
	],
	npcs: { clerk: { name: "Clerk", place: "shop", voice }, mayor: { name: "Mayor", place: "hall", voice }, sailor: { name: "Sailor", place: "dock", voice } },
	achievements: { list: [{ id: "all", name: "All of it", how: "Everything." }] },
	unlocks: { gate: { stamps: "all" } },
	music: {
		tracks: { theme: { file: "a" }, night: { file: "b" }, snow: { file: "c" }, work: { file: "d" } },
		playlist: { title: "theme", credits: "theme", outdoors: { day: "theme", night: "night", winter: "snow" }, indoors: { default: "work", maps: {} } },
	},
	strings: { "passport.title": "The Book" },
} as unknown as GameContent);

describe("GameData", () => {
	it("stamps the places that give one, through their NPC", () => {
		expect(data.stampPlaces.map((p) => p.id)).toEqual(["shop", "hall"]);
		expect(data.stampForNpc("clerk")).toBe("shop");
		expect(data.stampForNpc("sailor")).toBeNull();
		const one = data.awardStamp([], "shop");
		expect(one).toEqual({ stamps: ["shop"], newStamp: "shop", complete: false });
		expect(data.awardStamp(one.stamps, "hall").complete).toBe(true);
	});

	it("opens an unlock with every stamp", () => {
		expect(data.isUnlocked("gate", { hasStamp: (p) => p === "shop" })).toBe(false);
		expect(data.isUnlocked("gate", { hasStamp: () => true })).toBe(true);
		expect(data.isUnlocked("nowhere", { hasStamp: () => true })).toBe(false);
	});

	it("finds deep-linked places with an entrance only", () => {
		expect(data.placeFromSearch("?at=Shop")?.id).toBe("shop");
		expect(data.placeFromSearch("?at=hall")).toBeNull();
		expect(data.placeFromSearch("?at=constructor")).toBeNull();
	});

	it("picks the track by the playlist", () => {
		const town = { scene: "world" as const, map: "town", outdoors: true, phase: "day" as const, season: "summer" as const, night: false };
		expect(data.trackFor(town)).toBe("theme");
		expect(data.trackFor({ ...town, season: "winter" })).toBe("snow");
		expect(data.trackFor({ ...town, night: true })).toBe("night");
		expect(data.trackFor({ ...town, outdoors: false })).toBe("work");
	});

	it("overrides the engine's words and gives voices", () => {
		expect(data.t("passport.title")).toBe("The Book");
		expect(data.t("toast.stamped", { place: "Shop", count: 1, total: 2 })).toBe("Stamped: Shop  1/2");
		expect(data.voiceFor("clerk")).toBe(voice);
		expect(data.voiceFor(null)).toBe(DEFAULT_VOICE);
	});
});
