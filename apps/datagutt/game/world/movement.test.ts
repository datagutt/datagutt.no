import { describe, expect, it } from "vitest";
import { GridMover, type MoverConfig } from "./movement";
import type { Point } from "./grid";

const config: MoverConfig = { walkSpeed: 4, runSpeed: 8, turnDelayMs: 90 };
const open = () => true;
const wallAt =
	(wall: Point) =>
	(p: Point): boolean =>
		!(p.x === wall.x && p.y === wall.y);

describe("GridMover", () => {
	it("walks immediately in the direction it already faces", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		const events = m.update(16, { dir: "right", run: false }, open);
		expect(events).toEqual([{ type: "stepStarted", from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }]);
		expect(m.moving).toBe(true);
	});

	it("turns in place on a tap in a new direction", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		expect(m.update(16, { dir: "down", run: false }, open)).toEqual([{ type: "turned", facing: "down" }]);
		expect(m.update(16, { dir: null, run: false }, open)).toEqual([]);
		expect(m.tile).toEqual({ x: 0, y: 0 });
		expect(m.facing).toBe("down");
	});

	it("starts walking once a new direction is held past the turn delay", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		m.update(16, { dir: "down", run: false }, open);
		expect(m.update(50, { dir: "down", run: false }, open)).toEqual([]);
		const events = m.update(50, { dir: "down", run: false }, open);
		expect(events.map((e) => e.type)).toEqual(["stepStarted"]);
	});

	it("takes exactly 1/speed seconds per tile", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		m.update(0, { dir: "right", run: false }, open);
		m.update(125, { dir: null, run: false }, open);
		expect(m.position.x).toBeCloseTo(0.5);
		const events = m.update(125, { dir: null, run: false }, open);
		expect(events).toEqual([{ type: "stepEnded", at: { x: 1, y: 0 } }]);
		expect(m.moving).toBe(false);
	});

	it("chains steps without losing time while the direction is held", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		m.update(0, { dir: "right", run: false }, open);
		// 1.5 tiles' worth of time in one frame.
		const events = m.update(375, { dir: "right", run: false }, open);
		expect(events.map((e) => e.type)).toEqual(["stepEnded", "stepStarted"]);
		expect(m.position.x).toBeCloseTo(1.5);
	});

	it("turns a corner mid-walk without the turn delay", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		m.update(0, { dir: "right", run: false }, open);
		const events = m.update(250, { dir: "down", run: false }, open);
		expect(events.map((e) => e.type)).toEqual(["stepEnded", "turned", "stepStarted"]);
		expect(m.destination).toEqual({ x: 1, y: 1 });
	});

	it("bumps once per hold instead of walking into a wall", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		const blocked = wallAt({ x: 1, y: 0 });
		expect(m.update(16, { dir: "right", run: false }, blocked).map((e) => e.type)).toEqual(["bumped"]);
		expect(m.update(16, { dir: "right", run: false }, blocked)).toEqual([]);
		m.update(16, { dir: null, run: false }, blocked);
		expect(m.update(16, { dir: "right", run: false }, blocked).map((e) => e.type)).toEqual(["bumped"]);
		expect(m.tile).toEqual({ x: 0, y: 0 });
	});

	it("runs at run speed", () => {
		const m = new GridMover({ x: 0, y: 0 }, "right", config);
		m.update(0, { dir: "right", run: true }, open);
		expect(m.update(125, { dir: null, run: false }, open)).toEqual([{ type: "stepEnded", at: { x: 1, y: 0 } }]);
	});

	it("walk() starts a scripted step with no turn delay", () => {
		const m = new GridMover({ x: 2, y: 2 }, "up", config);
		expect(m.walk("left", false, open).map((e) => e.type)).toEqual(["turned", "stepStarted"]);
		expect(m.destination).toEqual({ x: 1, y: 2 });
	});
});
