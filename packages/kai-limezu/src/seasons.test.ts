import { describe, expect, it } from "vitest";
import { DECALS, GRASS } from "./palette.ts";
import { PREFABS } from "./prefabs.ts";
import { paintSnowCaps, roofMask, seasonalColor, seasonalTile } from "./seasons.ts";
import { parseOverridePatch } from "./source.ts";

describe("seasonal tiles", () => {
	it("recolour vegetation sheets under a seasonal sheet id, flips kept", () => {
		expect(seasonalTile({ ...GRASS[0], flip: 1 }, "winter")).toEqual({ ...GRASS[0], sheet: "terrain@winter", flip: 1 });
		expect(seasonalTile({ sheet: "villas#Villa_1", col: 2, row: 1 }, "winter")?.sheet).toBe("villas@winter#Villa_1");
		// Roofs only change in winter; the sea never does.
		expect(seasonalTile({ sheet: "villas#Villa_1", col: 2, row: 1 }, "autumn")?.sheet).toBe("villas#Villa_1");
		expect(seasonalTile({ sheet: "sea", col: 1, row: 1 }, "winter")).toEqual({ sheet: "sea", col: 1, row: 1 });
	});

	it("clear flowers in winter and grow them from grass patches in spring", () => {
		expect(seasonalTile(DECALS.flowers.red[0], "winter")).toBeNull();
		expect(seasonalTile(DECALS.grassPatches[0], "spring")).toEqual({ ...DECALS.flowers.red[0], sheet: "garden@spring" });
	});

	it("use the camping sheet's own autumn trees", () => {
		const oak = PREFABS.oak;
		expect(seasonalTile({ sheet: "camping", col: oak.col + 1, row: oak.row + 2 }, "autumn")).toEqual({
			sheet: "camping@autumn",
			col: oak.col + 1,
			row: oak.row + 28,
		});
	});
});

describe("seasonal colours", () => {
	it("snow the grass in winter and leave other colours alone", () => {
		const [r, g, b] = seasonalColor([0x47, 0x97, 0x57], "terrain", "winter")!;
		expect(Math.min(r, g, b)).toBeGreaterThan(180);
		expect(seasonalColor([0xc0, 0x40, 0x40], "terrain", "winter")).toBeNull();
	});

	it("find roofs from the sky, not walls in the same colour below an eave", () => {
		// One column: air, three roof pixels, a thick eave, then wall in the roof's colour.
		const roof = [0x98, 0x47, 0x23, 255];
		const eave = [0xe0, 0xe0, 0xd0, 255];
		const column = [[0, 0, 0, 0], roof, roof, roof, eave, eave, eave, eave, roof, roof];
		const img = { data: new Uint8Array(column.flat()), width: 1, height: column.length };
		expect([...roofMask(img, "villas#Villa_1")!]).toEqual([0, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
		expect(roofMask(img, "terrain")).toBeNull();
	});

	it("cap roofs with shaded snow and leave the rest of the roof alone", () => {
		const roof = [0x98, 0x47, 0x23, 255];
		const column = [[0, 0, 0, 0], ...Array(10).fill(roof)];
		const img = { data: new Uint8Array(column.flat()), width: 1, height: column.length };
		paintSnowCaps(img, "villas#Villa_1");
		const px = (y: number) => [...img.data.slice(y * 4, y * 4 + 3)];
		// Snow on top, lighter than below it; the bottom of the roof keeps its colour.
		expect(px(1)[2]).toBeGreaterThan(200);
		expect(px(1)[0]).toBeGreaterThanOrEqual(px(2)[0]);
		expect(px(10)).toEqual(roof.slice(0, 3));
	});
});

describe("seasonal overrides", () => {
	it("name patches of a sheet by their top-left tile", () => {
		expect(parseOverridePatch("houses@16,250", "houses")).toEqual({ col: 16, row: 250 });
		expect(parseOverridePatch("houses@16,250", "villas")).toBeNull();
		expect(parseOverridePatch("villas#Villa_1", "villas")).toBeNull();
	});
});
