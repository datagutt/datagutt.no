import { describe, expect, it } from "vitest";
import { charDelayMs, choiceOfLine, paginate, wrapChoices, wrapText } from "./text";

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

describe("charDelayMs", () => {
	it("pauses after sentence and clause endings only", () => {
		const text = "Hei! Yes, 3.5 ok.";
		expect(charDelayMs(text, 4)).toBeGreaterThan(charDelayMs(text, 2)); // after "!"
		expect(charDelayMs(text, 9)).toBeGreaterThan(charDelayMs(text, 7)); // after ","
		expect(charDelayMs(text, 12)).toBe(charDelayMs(text, 2)); // inside "3.5"
		expect(charDelayMs(text, 4)).toBeGreaterThan(charDelayMs(text, 9)); // full stop beats comma
	});
});

describe("wrapChoices", () => {
	it("wraps long choices onto more lines and keeps track of where each starts", () => {
		const { lines, first } = wrapChoices(["Hello.", "Is there a quicker way to see everything?", "Bye."], 100, mono);
		expect(lines).toEqual(["Hello.", "Is there a quicker", "way to see", "everything?", "Bye."]);
		expect(first).toEqual([0, 1, 4]);
		expect([0, 1, 2, 3, 4].map((line) => choiceOfLine(first, line))).toEqual([0, 1, 1, 1, 2]);
	});
});
