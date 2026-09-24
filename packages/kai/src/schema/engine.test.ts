import { describe, expect, it } from "vitest";
import { music } from "./engine.ts";

const playlist = {
	title: "theme",
	credits: "theme",
	outdoors: { day: "theme", night: "theme", winter: "theme" },
	indoors: { default: "theme", maps: { office: "work" } },
};

describe("music", () => {
	it("accepts a playlist of known tracks", () => {
		expect(music.safeParse({ tracks: { theme: { file: "a.mp3" }, work: { file: "b.mp3" } }, playlist }).success).toBe(true);
	});

	it("names each playlist entry whose track is missing", () => {
		const result = music.safeParse({ tracks: { theme: { file: "a.mp3" } }, playlist });
		expect(result.error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual(['playlist.indoors.maps.office: no track "work" in tracks']);
	});
});
