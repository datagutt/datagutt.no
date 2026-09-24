import { describe, expect, it } from "vitest";
import { STAMP_PLACES } from "./passport";
import { isUnlocked } from "./unlocks";

describe("unlocks", () => {
	it("opens the mountain trail only with every passport stamp", () => {
		const all = STAMP_PLACES.map((p) => p.id);
		expect(isUnlocked("passport", { stamps: all.slice(1), flags: {} })).toBe(false);
		expect(isUnlocked("passport", { stamps: all, flags: {} })).toBe(true);
	});
});
