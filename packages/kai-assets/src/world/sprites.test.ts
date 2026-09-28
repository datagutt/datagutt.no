import { spriteObject } from "@datagutt/kai/world/objects";
import { describe, expect, it } from "vitest";
import { spriteProblems } from "./sprites.ts";

const sprites = { gull: { file: "gull.png", frameWidth: 32, frameHeight: 32, frames: 6, frameRate: 5 } };

describe("spriteProblems", () => {
	it("accepts sprites kai.json has, in a known layer, season and time of day", () => {
		const ok = spriteObject.at(1, 2, { sprite: "gull", layer: "above", seasons: "spring,summer", when: "day" });
		expect(spriteProblems("town", [ok], sprites)).toEqual([]);
	});

	it("names what the game would silently leave out", () => {
		const problems = spriteProblems(
			"town",
			[spriteObject.at(1, 2, { sprite: "crab" }), spriteObject.at(3, 4, { sprite: "gull", layer: "roof", seasons: "summer,monsoon", when: "dusk" })],
			sprites,
		).join("\n");
		expect(problems).toMatch(/sprite "crab" at \(1, 2\) is not in kai.json sprites/);
		expect(problems).toMatch(/layer "roof"/);
		expect(problems).toMatch(/season "monsoon"/);
		expect(problems).toMatch(/when "dusk"/);
	});
});
