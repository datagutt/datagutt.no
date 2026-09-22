import { describe, expect, it } from "vitest";
import { paginate, wrapText } from "./text";

const mono: (t: string) => number = (t) => t.length * 5;

describe("wrapText", () => {
	it("wraps on word boundaries within the width", () => {
		const lines = wrapText("Welcome to Fjord Town, traveller.", 60, mono);
		expect(lines).toEqual(["Welcome to", "Fjord Town,", "traveller."]);
		expect(lines.every((l) => mono(l) <= 60)).toBe(true);
	});

	it("keeps explicit line breaks and hard-breaks very long words", () => {
		expect(wrapText("a\nb", 100, mono)).toEqual(["a", "b"]);
		expect(wrapText("supercalifragilistic", 30, mono)).toEqual(["superc", "alifra", "gilist", "ic"]);
	});
});

describe("paginate", () => {
	it("splits into pages and never returns zero pages", () => {
		expect(paginate(["1", "2", "3"], 2)).toEqual([["1", "2"], ["3"]]);
		expect(paginate([], 3)).toEqual([[""]]);
	});
});
