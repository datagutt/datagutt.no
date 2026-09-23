import { describe, expect, it } from "vitest";
import { FrameWatch, qualityFor } from "./quality";

describe("effects quality", () => {
	it("follows the setting, auto dropping to low once frames were slow", () => {
		expect(qualityFor("high", true)).toBe("high");
		expect(qualityFor("low", false)).toBe("low");
		expect(qualityFor("auto", false)).toBe("high");
		expect(qualityFor("auto", true)).toBe("low");
	});

	it("judges frame rate over a window after the map settles", () => {
		const fast = new FrameWatch();
		let said = false;
		for (let i = 0; i < 400; i++) said ||= fast.sample(16.7);
		expect(said).toBe(false);
		const slow = new FrameWatch();
		for (let i = 0; i < 400 && !said; i++) said = slow.sample(40);
		expect(said).toBe(true);
		expect(slow.sample(40)).toBe(false); // decided once
	});
});
