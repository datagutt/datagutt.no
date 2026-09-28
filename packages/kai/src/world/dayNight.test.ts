import { describe, expect, it } from "vitest";
import { clock, daylightAt, lightFactor, monthNow, parseTime } from "./dayNight.ts";

describe("time of day", () => {
	it("runs from night through dawn, day and dusk", () => {
		expect(daylightAt(2)).toMatchObject({ phase: "night", dark: 1 });
		expect(daylightAt(6.5)).toMatchObject({ phase: "dawn", tint: 0xe7b7c6 });
		expect(daylightAt(12)).toEqual({ phase: "day", dark: 0, tint: 0xffffff });
		expect(daylightAt(19).phase).toBe("dusk");
		expect(daylightAt(23.99).phase).toBe("night");
		// Halfway into dusk it is half as dark as dusk's peak.
		expect(daylightAt(18.25).dark).toBeCloseTo(0.2);
	});

	it("keeps June nights light", () => {
		expect(daylightAt(1, 6).dark).toBeCloseTo(0.3);
		expect(daylightAt(1, 12).dark).toBe(1);
		expect(monthNow("?debug&month=6", () => new Date(2026, 0, 1))()).toBe(6);
		expect(monthNow("", () => new Date(2026, 0, 1))()).toBe(1);
	});

	it("reads ?time= as a phase or a clock time, in debug only", () => {
		expect(parseTime("dusk")).toBe(19);
		expect(parseTime("06:30")).toBe(6.5);
		expect(parseTime("25:00")).toBeNull();
		expect(parseTime("soon")).toBeNull();
		const at = new Date(2026, 8, 23, 14, 45);
		expect(clock("?debug&time=night", () => at)()).toBe(23);
		expect(clock("?time=night", () => at)()).toBe(14.75);
	});

	it("turns night lights up and daylight down as it gets dark", () => {
		expect(lightFactor("night", 0.8)).toBe(0.8);
		expect(lightFactor("day", 0.8)).toBeCloseTo(0.2);
		expect(lightFactor(undefined, 0.8)).toBe(1);
	});
});
