import { describe, expect, it } from "vitest";
import { applySeason, formatSeasonTable, parseSeasonTable, resolveSeason, seasonOn } from "./season";

describe("seasons", () => {
	it("follow the Norwegian calendar", () => {
		expect(seasonOn(new Date("2026-01-15T12:00:00Z"))).toBe("winter");
		expect(seasonOn(new Date("2026-03-01T12:00:00Z"))).toBe("spring");
		expect(seasonOn(new Date("2026-07-01T12:00:00Z"))).toBe("summer");
		expect(seasonOn(new Date("2026-10-31T12:00:00Z"))).toBe("autumn");
		expect(seasonOn(new Date("2026-12-01T12:00:00Z"))).toBe("winter");
		// 23:30 UTC on 30 November is already December in Oslo.
		expect(seasonOn(new Date("2026-11-30T23:30:00Z"))).toBe("winter");
	});

	it("can be picked with ?season= in debug only", () => {
		const july = new Date("2026-07-01T12:00:00Z");
		expect(resolveSeason("?debug&season=winter", july)).toBe("winter");
		expect(resolveSeason("?season=winter", july)).toBe("summer");
		expect(resolveSeason("?debug&season=monsoon", july)).toBe("summer");
	});

	it("round-trip swap tables", () => {
		const table = new Map([
			[12, 40],
			[3, 0],
		]);
		expect(formatSeasonTable(table)).toBe("3:0,12:40");
		expect(parseSeasonTable("3:0,12:40")).toEqual(new Map([[3, 0], [12, 40]]));
	});

	it("swap tiles, keep their flips and clear the ones a season removes", () => {
		const H = 0x80000000;
		const map = {
			properties: [{ name: "season:winter", value: "5:9,6:0" }],
			layers: [
				{ type: "tilelayer", data: [5, H + 5, 6, 7] },
				{ type: "objectgroup" },
			],
		};
		const winter = applySeason(map, "winter");
		expect(winter.layers[0].data).toEqual([9, H + 9, 0, 7]);
		expect(winter.layers[1]).toBe(map.layers[1]);
		expect(map.layers[0].data).toEqual([5, H + 5, 6, 7]);
		expect(applySeason(map, "spring")).toBe(map);
		expect(applySeason(map, "summer")).toBe(map);
	});
});
