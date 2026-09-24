import { describe, expect, it } from "vitest";
import { gridMask, pieceAt, thicken } from "./autotile.ts";

const mask = (rows: string[]) => gridMask(rows.map((r) => [...r].map((c) => c === "#")));

describe("pieceAt", () => {
	it("picks corners, edges and centre for a rectangle", () => {
		const m = mask([
			".....", //
			".###.",
			".###.",
			".###.",
			".....",
		]);
		const pieces = (y: number) => [1, 2, 3].map((x) => pieceAt(m, x, y));
		expect(pieces(1)).toEqual(["nw", "n", "ne"]);
		expect(pieces(2)).toEqual(["w", "center", "e"]);
		expect(pieces(3)).toEqual(["sw", "s", "se"]);
		expect(pieceAt(m, 0, 0)).toBeNull();
	});

	it("picks inner corners where the region wraps around a notch", () => {
		const m = mask([
			"###.", //
			"####",
			"####",
		]);
		// (2,1) has everything around it except its NE diagonal (3,0).
		expect(pieceAt(m, 2, 1)).toBe("inner_ne");
	});

	it("treats the map edge as inside the region by default", () => {
		const m = mask(["##", "##"]);
		expect(pieceAt(m, 0, 0)).toBe("center");
		expect(pieceAt(m, 0, 0, false)).toBe("nw");
	});
});

describe("thicken", () => {
	it("grows one-wide strips and fills diagonal touches", () => {
		const grown = thicken(
			mask([
				"......", //
				".#....",
				"..#...",
				"......",
			]),
		);
		const g = gridMask(grown);
		// Every region cell is now part of a full 2×2 block.
		for (let y = 0; y < g.height; y++) {
			for (let x = 0; x < g.width; x++) {
				if (!g.get(x, y)) continue;
				const inBlock = [
					[0, 0],
					[-1, 0],
					[0, -1],
					[-1, -1],
				].some(([ox, oy]) => [0, 1].every((dy) => [0, 1].every((dx) => g.get(x + ox + dx, y + oy + dy))));
				expect(inBlock, `${x},${y}`).toBe(true);
			}
		}
	});
});

describe("thicken gaps", () => {
	it("fills holes and channels thinner than two cells", () => {
		const grown = gridMask(
			thicken(
				mask([
					"######", //
					"##..##",
					"######",
					"######",
				]),
			),
		);
		expect(grown.get(2, 1)).toBe(true);
		expect(grown.get(3, 1)).toBe(true);
	});
});
