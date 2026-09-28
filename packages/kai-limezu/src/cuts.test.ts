import { describe, expect, it } from "vitest";
import { catalog, single } from "./singles.ts";
import { checkCuts } from "./cuts.ts";

describe("sprite catalogue", () => {
	it("gives singles their real size", () => {
		const villa = single("villas", "Villa_1");
		expect(villa).toMatchObject({ sheet: "villas#Villa_1", w: 9, h: 13 });
		expect(() => single("villas", "No_Such_Villa")).toThrow(/not in the catalogue/);
	});

	it("resolves singles of recoloured sheets through their base sheet", () => {
		expect(single("villaRed", "Villa_5")).toMatchObject({ sheet: "villaRed#Villa_5", w: 9, h: 13 });
	});

	it("has a catalogue for every sheet with singles", () => {
		expect(catalog("living")?.method).toBe("singles");
		expect(catalog("generic")?.method).toBe("detected");
	});
});

describe("checkCuts", () => {
	it("flags a prefab that slices an object and suggests its single", () => {
		// The villa is 9 tiles wide with its shadow; 8 cuts it.
		const problems = checkCuts("t", [{ sheet: "villas", col: 0, row: 0, w: 8, h: 13, aboveRows: 0 }]);
		expect(problems.join("\n")).toMatch(/cuts object Villa_1 .*use single\("villas", "Villa_1"\)/);
	});

	it("accepts whole objects, singles and deliberate crops", () => {
		expect(checkCuts("t", [{ sheet: "villas", col: 0, row: 0, w: 9, h: 13, aboveRows: 0 }])).toEqual([]);
		expect(checkCuts("t", [single("villas", "Villa_1")])).toEqual([]);
		expect(checkCuts("t", [{ sheet: "villas", col: 0, row: 0, w: 8, h: 13, aboveRows: 0, allowCut: "test" }])).toEqual([]);
	});
});
