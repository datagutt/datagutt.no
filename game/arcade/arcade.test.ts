import { describe, expect, it } from "vitest";
import { Board, COLS, FallingBlocks, fallDelay, linePoints, ROWS } from "./blocks";
import { COLS as DCOLS, generateDungeon, nextStep } from "./dungeon";
import { lifeStep } from "./life";
import { NO_INPUT, rng, type ArcadeInput } from "./types";

const press = (a: boolean): ArcadeInput => ({ ...NO_INPUT, a });

describe("falling blocks", () => {
	it("clears full rows and drops the rest", () => {
		const board = new Board();
		// Fill the bottom row but for four cells, then a flat I piece fills the gap.
		for (let x = 0; x < COLS; x++) if (x < 3 || x > 6) board.cells[ROWS - 1][x] = 1;
		board.cells[ROWS - 2][0] = 2;
		expect(board.lock({ shape: 0, rotation: 0, x: 3, y: ROWS - 2 })).toBe(1);
		expect(board.cells[ROWS - 1][0]).toBe(2);
		expect(board.cells[ROWS - 1].filter((c) => c >= 0)).toHaveLength(1);
	});

	it("reports a piece locked above the top", () => {
		expect(new Board().lock({ shape: 1, rotation: 0, x: 3, y: -2 })).toBe(-1);
	});

	it("kicks a rotation off the wall", () => {
		const board = new Board();
		// An upright I against the right wall turns flat by moving left.
		const turned = board.rotate({ shape: 0, rotation: 1, x: COLS - 3, y: 5 });
		expect(turned).not.toBeNull();
		expect(board.fits(turned!)).toBe(true);
	});

	it("scores more for more lines and higher levels, and falls faster", () => {
		expect(linePoints(4, 1)).toBeGreaterThan(linePoints(1, 1) * 4);
		expect(linePoints(1, 3)).toBe(linePoints(1, 1) * 3);
		expect(fallDelay(5)).toBeLessThan(fallDelay(1));
		expect(fallDelay(99)).toBe(60);
	});

	it("starts on A, ends when the stack reaches the top, and reports a new best", () => {
		const best: number[] = [];
		const game = new FallingBlocks(0, (s) => best.push(s), 7);
		game.step(16, press(true));
		for (let i = 0; i < 200 && !best.length; i++) game.step(16, press(true));
		expect(best).toHaveLength(1);
		expect(best[0]).toBeGreaterThan(0);
	});
});

describe("life", () => {
	it("turns a blinker", () => {
		const cols = 5;
		const cells = new Uint8Array(25);
		for (const x of [1, 2, 3]) cells[2 * cols + x] = 1;
		const next = lifeStep(cells, cols, 5);
		expect([...[1, 2, 3].map((y) => next[y * cols + 2])]).toEqual([1, 1, 1]);
		expect(next[2 * cols + 1]).toBe(0);
	});
});

describe("dungeon", () => {
	it("joins every room to the first", () => {
		for (const seed of [1, 2, 3, 42]) {
			const { floor, rooms } = generateDungeon(rng(seed));
			expect(rooms.length).toBeGreaterThan(3);
			const at = (r: (typeof rooms)[number]) => (r.y + Math.floor(r.h / 2)) * DCOLS + r.x + Math.floor(r.w / 2);
			for (const room of rooms.slice(1)) expect(nextStep(floor, at(rooms[0]), at(room)), `seed ${seed}`).not.toBeNull();
		}
	});
});
