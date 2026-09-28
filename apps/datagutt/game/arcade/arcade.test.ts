import { NO_INPUT, type ArcadeInput } from "@datagutt/kai-arcade";
import { describe, expect, it } from "vitest";
import { ARCADE_IDS } from "./ids";
import { makeArcade } from "./index";

describe("every cabinet", () => {
	it("builds, runs and draws for each id a map can name", () => {
		const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
		const input: ArcadeInput = { held: new Set(["left"]), pressed: new Set(["up"]), a: true };
		for (const id of ARCADE_IDS) {
			const game = makeArcade(id, { best: () => 0, record: () => {} });
			expect(game.title, id).toBeTruthy();
			for (let i = 0; i < 30; i++) game.step(33, i === 0 ? input : NO_INPUT);
			expect(() => game.draw(ctx), id).not.toThrow();
		}
	});
});
