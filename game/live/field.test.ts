import { describe, expect, it } from "vitest";
import { fieldLevels } from "./field";

describe("fieldLevels", () => {
	it("lays days out by week and weekday, newest week on the right", () => {
		// 2026-09-23 is a Wednesday.
		const days = [
			{ date: "2026-09-23", count: 9, level: 4 as const },
			{ date: "2026-09-20", count: 1, level: 1 as const }, // Sunday of the same week
			{ date: "2026-09-13", count: 3, level: 2 as const }, // Sunday a week earlier
		];
		const grid = fieldLevels(days, 3);
		expect(grid[3][2]).toBe(4); // Wednesday, last column
		expect(grid[0][2]).toBe(1); // Sunday, last column
		expect(grid[0][1]).toBe(2); // Sunday, the column before
		expect(grid[4][2]).toBeNull(); // Thursday hasn't happened yet
		expect(grid[1][0]).toBe(0); // no data: bare soil
	});

	it("is all bare soil without data", () => {
		expect(fieldLevels([], 2)).toEqual(Array.from({ length: 7 }, () => [0, 0]));
	});
});
