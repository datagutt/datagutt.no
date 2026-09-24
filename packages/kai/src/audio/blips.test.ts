import { describe, expect, it } from "vitest";
import { shouldBlip } from "./blips.ts";

describe("shouldBlip", () => {
	it("blips on letters only, on a steady rhythm", () => {
		const text = "Hei, du!";
		const hits = [...text].map((_, i) => shouldBlip(text, i, 2));
		// Letters: H e i d u -> 1st, 3rd, 5th letter blip.
		expect(hits).toEqual([true, false, true, false, false, false, true, false]);
	});

	it("handles Norwegian letters and every-letter voices", () => {
		expect(shouldBlip("æøå", 1, 1)).toBe(true);
		expect(shouldBlip("   ", 1, 1)).toBe(false);
	});
});
