import { describe, expect, it } from "vitest";
import { sideAway, waddleRoom } from "./critters.ts";

describe("critters", () => {
	it("get away from the player's side", () => {
		expect(sideAway(100, 60)).toBe("right");
		expect(sideAway(40, 60)).toBe("left");
		expect(sideAway(60, 60)).toBe("right");
	});

	it("waddle only over walkable tiles, and no further than they need", () => {
		const open = () => true;
		expect(waddleRoom({ x: 5, y: 5 }, "right", open)).toBe(3);
		const wallAt7 = (x: number) => x !== 7;
		expect(waddleRoom({ x: 5, y: 5 }, "right", wallAt7)).toBe(1);
		expect(waddleRoom({ x: 5, y: 5 }, "left", wallAt7)).toBe(3);
		expect(waddleRoom({ x: 5, y: 5 }, "right", () => false)).toBe(0);
	});
});
