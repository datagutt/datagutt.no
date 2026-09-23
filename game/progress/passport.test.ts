import { describe, expect, it } from "vitest";
import { NPCS } from "../npcs";
import { STAMP_PLACES, awardStamp, stampForNpc } from "./passport";

describe("passport", () => {
	it("has one stamp per place that presents content", () => {
		expect(STAMP_PLACES.map((p) => p.id)).toEqual([
			"home",
			"boathouse",
			"radio-tower",
			"kiosk",
			"office",
			"town-hall",
			"gym",
			"library",
			"farm",
			"post-office",
		]);
	});

	it("maps every stamp place to exactly one NPC who gives it", () => {
		for (const place of STAMP_PLACES) {
			expect(NPCS.filter((n) => stampForNpc(n.id) === place.id), place.id).toHaveLength(1);
		}
		expect(stampForNpc("ferryman")).toBeNull(); // the dock gives no stamp
	});

	it("awards each stamp once and notices a full passport", () => {
		let stamps: string[] = [];
		const first = awardStamp(stamps, "library");
		expect(first).toEqual({ stamps: ["library"], newStamp: "library", complete: false });
		expect(awardStamp(first.stamps, "library").newStamp).toBeNull();
		expect(awardStamp(first.stamps, "nowhere").newStamp).toBeNull();

		stamps = [];
		let last = awardStamp(stamps, null);
		for (const p of STAMP_PLACES) last = awardStamp(last.stamps, p.id);
		expect(last.complete).toBe(true);
		expect(last.stamps).toHaveLength(STAMP_PLACES.length);
	});

	it("drops stamps for places that no longer exist", () => {
		expect(awardStamp(["gone", "farm"], null).stamps).toEqual(["farm"]);
	});
});
