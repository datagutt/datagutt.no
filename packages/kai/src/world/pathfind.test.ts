import { describe, expect, it } from "vitest";
import { CollisionGrid, directionBetween } from "./grid.ts";
import { findPath, findPathAdjacent } from "./pathfind.ts";

/** Build a grid from ASCII: '#' is a wall, anything else is floor. */
function gridFrom(rows: string[]): CollisionGrid {
	const g = new CollisionGrid(rows[0].length, rows.length);
	rows.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && g.setBlocked(x, y)));
	return g;
}

function isContinuous(start: { x: number; y: number }, path: { x: number; y: number }[]) {
	let prev = start;
	for (const p of path) {
		if (!directionBetween(prev, p)) return false;
		prev = p;
	}
	return true;
}

describe("findPath", () => {
	it("returns [] when already at the target", () => {
		expect(findPath(gridFrom(["..."]), { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([]);
	});

	it("finds a shortest path around walls", () => {
		const g = gridFrom([
			".....", //
			".###.",
			"...#.",
			".#...",
		]);
		const path = findPath(g, { x: 0, y: 0 }, { x: 2, y: 2 })!;
		expect(path).not.toBeNull();
		expect(path.at(-1)).toEqual({ x: 2, y: 2 });
		expect(path).toHaveLength(4);
		expect(isContinuous({ x: 0, y: 0 }, path)).toBe(true);
		expect(path.every((p) => g.isWalkable(p.x, p.y))).toBe(true);
	});

	it("returns null for unreachable or blocked targets", () => {
		const g = gridFrom([".#.", ".#.", ".#."]);
		expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
		expect(findPath(g, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
	});

	it("prefers straight runs over zig-zags of equal length", () => {
		const g = gridFrom(["....", "....", "...."]);
		const path = findPath(g, { x: 0, y: 0 }, { x: 3, y: 2 })!;
		let turns = 0;
		let prevDir = directionBetween({ x: 0, y: 0 }, path[0]);
		for (let i = 1; i < path.length; i++) {
			const dir = directionBetween(path[i - 1], path[i]);
			if (dir !== prevDir) turns++;
			prevDir = dir;
		}
		expect(path).toHaveLength(5);
		expect(turns).toBe(1);
	});

	it("treats occupied tiles as blocked for everyone but the occupant", () => {
		const g = gridFrom(["...", "...", "..."]);
		g.occupy(1, 0, "npc");
		expect(g.isWalkable(1, 0)).toBe(false);
		expect(g.isWalkable(1, 0, "npc")).toBe(true);
		const path = findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })!;
		expect(path.some((p) => p.x === 1 && p.y === 0)).toBe(false);
	});

	it("gives up on huge searches instead of stalling", () => {
		const g = gridFrom(Array.from({ length: 200 }, () => ".".repeat(200)));
		expect(findPath(g, { x: 0, y: 0 }, { x: 199, y: 199 }, { maxExpanded: 50 })).toBeNull();
	});
});

describe("findPathAdjacent", () => {
	it("walks to the nearest free side of a blocked target", () => {
		const g = gridFrom([
			".....", //
			"..#..",
			".....",
		]);
		const path = findPathAdjacent(g, { x: 0, y: 1 }, { x: 2, y: 1 })!;
		expect(path.at(-1)).toEqual({ x: 1, y: 1 });
	});

	it("returns [] when already next to the target", () => {
		const g = gridFrom(["..#.."]);
		expect(findPathAdjacent(g, { x: 1, y: 0 }, { x: 2, y: 0 })).toEqual([]);
	});
});
