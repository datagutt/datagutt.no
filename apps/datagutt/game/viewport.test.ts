import { describe, expect, it } from "vitest";
import { TILE } from "./constants";
import { MIN_SHORT_TILES, computeViewport } from "./viewport";

const screens = [
	{ name: "iPhone portrait", w: 390, h: 844, dpr: 3 },
	{ name: "iPhone landscape", w: 844, h: 390, dpr: 3 },
	{ name: "Android odd DPR", w: 412, h: 915, dpr: 2.625 },
	{ name: "1080p desktop", w: 1920, h: 1080, dpr: 1 },
	{ name: "laptop 1.25x", w: 1536, h: 864, dpr: 1.25 },
	{ name: "4K at 1.5x", w: 2560, h: 1440, dpr: 1.5 },
	{ name: "tiny window", w: 200, h: 150, dpr: 1 },
];

describe("computeViewport", () => {
	it.each(screens)("scales $name by whole device pixels and covers the screen", ({ w, h, dpr }) => {
		const v = computeViewport(w, h, dpr);
		expect(Number.isInteger(v.zoom)).toBe(true);
		expect(v.zoom).toBeGreaterThanOrEqual(1);
		// Each game pixel is exactly `zoom` device pixels.
		expect(v.cssWidth * dpr).toBeCloseTo(v.width * v.zoom, 6);
		// Covers the screen, overhanging by less than one game pixel.
		expect(v.cssWidth).toBeGreaterThanOrEqual(w - 1e-6);
		expect(v.cssHeight).toBeGreaterThanOrEqual(h - 1e-6);
		expect(v.cssWidth - w).toBeLessThan(v.zoom / dpr);
	});

	it.each(screens.filter((s) => s.name !== "tiny window"))(
		"shows at least the minimum tiles on the short axis for $name",
		({ w, h, dpr }) => {
			const v = computeViewport(w, h, dpr);
			expect(Math.min(v.width, v.height) / TILE).toBeGreaterThanOrEqual(MIN_SHORT_TILES);
		},
	);

	it("keeps sprites big on phones and shows more world on desktops", () => {
		const phone = computeViewport(390, 844, 3);
		const desktop = computeViewport(1920, 1080, 1);
		expect(phone.width / TILE).toBeLessThan(14);
		expect(desktop.height / TILE).toBeGreaterThan(15);
	});
});
