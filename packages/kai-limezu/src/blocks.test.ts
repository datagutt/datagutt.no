import { describe, expect, it } from "vitest";
import { pieceTile } from "./blocks.ts";

describe("pieceTile", () => {
	it("maps pieces into the 7×4 block", () => {
		const block = { sheet: "terrain", col: 0, row: 30 };
		expect(pieceTile(block, "center")).toEqual({ sheet: "terrain", col: 1, row: 31 });
		expect(pieceTile(block, "inner_nw")).toEqual({ sheet: "terrain", col: 4, row: 31 });
	});
});
