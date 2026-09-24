import { describe, expect, it } from "vitest";
import { distanceField, FAR } from "./distance.ts";

describe("distanceField", () => {
	it("counts steps to the nearest source, or FAR without any", () => {
		const d = distanceField(4, 3, (x, y) => x === 0 && y === 0);
		expect(d[0]).toBe(0);
		expect(d[2 * 4 + 3]).toBe(5);
		expect(distanceField(2, 2, () => false)[3]).toBe(FAR);
	});
});
