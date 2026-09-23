import { describe, expect, it } from "vitest";
import { blitTile } from "./atlas";
import { FLIP, MapCanvas, type Prefab } from "./canvas";
import { TileRegistry } from "./registry";
import { canvasToTmj, decodeGid } from "./tmj";

const chair: Prefab = { sheet: "s", col: 10, row: 20, w: 2, h: 1, aboveRows: 0, collision: ["#."] };

describe("stamp transforms", () => {
	it("mirrors tiles, flags and collision with flipX", () => {
		const c = new MapCanvas(2, 1).stamp(chair, 0, 0, "flipX");
		expect(c.get("below", 0, 0)).toEqual({ sheet: "s", col: 11, row: 20, flip: FLIP.H });
		expect(c.get("below", 1, 0)).toEqual({ sheet: "s", col: 10, row: 20, flip: FLIP.H });
		expect([c.isBlocked(0, 0), c.isBlocked(1, 0)]).toEqual([false, true]);
	});

	it("turns a 2×1 prefab into 1×2 with rot90", () => {
		const c = new MapCanvas(1, 2).stamp(chair, 0, 0, "rot90");
		expect(c.get("below", 0, 0)).toMatchObject({ col: 10, flip: FLIP.D | FLIP.H });
		expect(c.get("below", 0, 1)).toMatchObject({ col: 11 });
		expect([c.isBlocked(0, 0), c.isBlocked(0, 1)]).toEqual([true, false]);
	});

	it("writes flips into gids and reads them back", () => {
		const tmj = canvasToTmj("t", new MapCanvas(1, 2).stamp(chair, 0, 0, "rot270"), new TileRegistry());
		const below = tmj.layers.find((l) => l.name === "below")!.data as number[];
		expect(below.map(decodeGid)).toEqual([
			{ gid: 3, flip: FLIP.D | FLIP.V },
			{ gid: 4, flip: FLIP.D | FLIP.V },
		]);
	});
});

describe("blitTile", () => {
	it("rotates pixels clockwise for D|H, as Tiled does", () => {
		const src = { data: Buffer.alloc(16 * 16 * 4), width: 16, height: 16 };
		src.data.set([255, 0, 0, 255], 0); // a red pixel at the top-left
		const dst = { data: Buffer.alloc(16 * 16 * 4), width: 16, height: 16 };
		blitTile(src, 0, 0, dst, 0, 0, FLIP.D | FLIP.H);
		// Top-left turns clockwise to top-right.
		expect([...dst.data.subarray(15 * 4, 15 * 4 + 4)]).toEqual([255, 0, 0, 255]);
	});
});
