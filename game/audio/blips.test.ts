import { describe, expect, it } from "vitest";
import { npc } from "../npcs";
import { shouldBlip, voiceFor, DEFAULT_VOICE } from "./blips";

describe("shouldBlip", () => {
	it("blips on letters only, on a steady rhythm", () => {
		const text = "Hei, du!";
		const hits = [...text].map((_, i) => shouldBlip(text, i, 2));
		// Letters: H e i d u -> 1st, 3rd, 5th letter blip.
		expect(hits).toEqual([true, false, true, false, false, false, true, false]);
	});

	it("handles Norwegian letters and every-letter voices", () => {
		expect(shouldBlip("æøå", 1, 1)).toBe(true);
		expect(shouldBlip("   ", 1, 1)).toBe(false);
	});
});

describe("voiceFor", () => {
	it("gives known characters their own voice", () => {
		expect(voiceFor("ferryman")).toBe(npc("ferryman")!.voice);
		expect(voiceFor("ferryman").pitch).not.toBe(voiceFor("datagutt").pitch);
		expect(voiceFor("nobody")).toBe(DEFAULT_VOICE);
		expect(voiceFor(null)).toBe(DEFAULT_VOICE);
	});
});
