import { describe, expect, it } from "vitest";
import { GENERATED_MAPS } from "../../world/gen/maps/index";
import { doingFor, MOCK_PRESENCES, nextMap, nowDoing, PLACE_MAPS, spotId, statusLines, type Place } from "./datagutt";

describe("the datagutt NPC", () => {
	it("goes where his presence says, first rule first", () => {
		const place = (name: string) => doingFor(MOCK_PRESENCES[name]);
		expect(place("offline")).toMatchObject({ place: "bed", asleep: true, emote: "sleep", says: null });
		expect(place("coding")).toMatchObject({ place: "desk", emote: "computer", says: "shipping it" });
		expect(place("gaming")).toMatchObject({ place: "desk", emote: "computer" });
		expect(place("music")).toMatchObject({ place: "fjord", emote: "music" });
		expect(place("idle")).toMatchObject({ place: "square", emote: "dots", wanders: false });
		expect(place("online")).toMatchObject({ place: "square", wanders: true, says: "touching grass" });
		expect(doingFor(null)).toMatchObject({ place: "desk", emote: null });
		// Coding beats music.
		expect(doingFor({ ...MOCK_PRESENCES.coding, spotify: { song: "x", artist: "y" } }).place).toBe("desk");
	});

	it("finds the way between maps through their doors", () => {
		expect(nextMap("house-up", "town")).toBe("house");
		expect(nextMap("house", "town")).toBe("town");
		expect(nextMap("town", "house-up")).toBe("house");
		expect(nextMap("town", "town")).toBeNull();
		expect(nextMap("town", "library")).toBeNull();
	});

	it("has a spot for every place, on the map it says, and doors along the way", () => {
		const built = new Map(GENERATED_MAPS.map((m) => [m.id, m.build()]));
		for (const [place, map] of Object.entries(PLACE_MAPS)) {
			const spots = built.get(map)!.objects.filter((o) => o.type === "spot" && o.id === spotId(place as Place));
			expect(spots, `${spotId(place as Place)} on ${map}`).toHaveLength(1);
		}
		for (const [from, to] of [["house-up", "house"], ["house", "house-up"], ["house", "town"], ["town", "house"]]) {
			expect(built.get(from)!.objects.some((o) => o.type === "door" && o.toMap === to), `door ${from} → ${to}`).toBe(true);
		}
	});

	it("says what he is up to", () => {
		expect(nowDoing(MOCK_PRESENCES.coding)).toContain("Visual Studio Code");
		expect(nowDoing(MOCK_PRESENCES.music)).toContain('"Midnight City" by M83');
		expect(nowDoing(MOCK_PRESENCES.offline)).toBe("");
		expect(statusLines(MOCK_PRESENCES.music)).toEqual(["Discord: Online", "Listening to Midnight City by M83", "By the fjord, down at the harbour."]);
	});
});
