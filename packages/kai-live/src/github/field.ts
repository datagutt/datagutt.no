// A field of crops from the contribution calendar: columns are weeks (oldest on the
// left), rows are weekdays (Sunday on top), like GitHub's grid.
import type { ContributionDay } from "../github.ts";

export type Level = 0 | 1 | 2 | 3 | 4;

/**
 * The level of each cell of a `weeks`×7 field ending with the week of the newest day,
 * as rows of columns. Days after the newest one (the rest of this week) are null.
 */
export function fieldLevels(days: readonly ContributionDay[], weeks: number): (Level | null)[][] {
	const grid: (Level | null)[][] = Array.from({ length: 7 }, () => Array<Level | null>(weeks).fill(0));
	if (!days.length) return grid;
	const byDate = new Map(days.map((d) => [d.date, d.level]));
	const newest = days.reduce((a, b) => (a.date > b.date ? a : b)).date;
	const end = new Date(`${newest}T00:00:00Z`);
	// Sunday of the first week shown.
	const start = new Date(end);
	start.setUTCDate(end.getUTCDate() - end.getUTCDay() - (weeks - 1) * 7);
	for (let col = 0; col < weeks; col++) {
		for (let row = 0; row < 7; row++) {
			const day = new Date(start);
			day.setUTCDate(start.getUTCDate() + col * 7 + row);
			grid[row][col] = day > end ? null : (byDate.get(day.toISOString().slice(0, 10)) ?? 0);
		}
	}
	return grid;
}
