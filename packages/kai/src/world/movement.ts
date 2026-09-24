// Tile-locked movement for the player and NPCs (docs/game/PLAN.md M1.5). Pure state, no
// Phaser, so the feel can be unit tested:
// - Pressing the direction you already face walks immediately.
// - Pressing a new direction while standing turns in place; keep holding it past the
//   turn delay and you start walking. Quick taps just change facing.
// - A held direction continues into the next step on the same frame the last one ends,
//   so walking never stutters and no input is dropped.
// - Walking into something blocked reports a single "bumped" per hold.
import type { Facing } from "./objects.ts";
import { neighbour, type Point } from "./grid.ts";

export type MoverConfig = {
	/** Tiles per second. */
	walkSpeed: number;
	runSpeed: number;
	/** How long a newly turned-to direction must be held before walking starts. */
	turnDelayMs: number;
};

export const PLAYER_MOVEMENT: MoverConfig = { walkSpeed: 4.5, runSpeed: 8, turnDelayMs: 90 };
export const NPC_MOVEMENT: MoverConfig = { walkSpeed: 3, runSpeed: 5, turnDelayMs: 0 };

export type MoverEvent =
	| { type: "turned"; facing: Facing }
	| { type: "stepStarted"; from: Point; to: Point }
	| { type: "stepEnded"; at: Point }
	| { type: "bumped"; facing: Facing; into: Point };

export type MoverInput = {
	/** Direction currently held, if any. */
	dir: Facing | null;
	run: boolean;
};

type Step = { from: Point; to: Point; progress: number; speed: number };

export class GridMover {
	tile: Point;
	facing: Facing;
	private step: Step | null = null;
	/** After turning in place: how long the new direction has been held. Null when not waiting. */
	private turnHeldMs: number | null = null;
	/** Direction of the last bump in the current hold, to report it only once. */
	private bumpedDir: Facing | null = null;

	constructor(
		start: Point,
		facing: Facing,
		private readonly config: MoverConfig,
	) {
		this.tile = { ...start };
		this.facing = facing;
	}

	get moving(): boolean {
		return this.step !== null;
	}

	/** Position in tiles, fractional while moving. */
	get position(): Point {
		if (!this.step) return { ...this.tile };
		const { from, to, progress } = this.step;
		return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
	}

	/** Tile the mover occupies or is heading into. */
	get destination(): Point {
		return this.step ? { ...this.step.to } : { ...this.tile };
	}

	/** Face a direction without moving (e.g. to talk to someone). */
	face(dir: Facing): MoverEvent[] {
		if (this.facing === dir) return [];
		this.facing = dir;
		return [{ type: "turned", facing: dir }];
	}

	/** Teleport, e.g. after a door. */
	place(tile: Point, facing: Facing): void {
		this.tile = { ...tile };
		this.facing = facing;
		this.step = null;
		this.turnHeldMs = null;
		this.bumpedDir = null;
	}

	/**
	 * Start a step right away in `dir` (path following, NPC scripts). No turn delay.
	 * Returns what happened; nothing if already moving.
	 */
	walk(dir: Facing, run: boolean, canEnter: (p: Point) => boolean): MoverEvent[] {
		const events: MoverEvent[] = [];
		if (this.step) return events;
		events.push(...this.face(dir));
		this.tryStart(run, canEnter, events);
		return events;
	}

	/** Advance by `dtMs` of held input. `canEnter` decides whether a tile may be entered now. */
	update(dtMs: number, input: MoverInput, canEnter: (p: Point) => boolean): MoverEvent[] {
		const events: MoverEvent[] = [];
		let remaining = dtMs;

		while (this.step) {
			const msPerTile = 1000 / this.step.speed;
			const needed = (1 - this.step.progress) * msPerTile;
			if (remaining < needed) {
				this.step.progress += remaining / msPerTile;
				return events;
			}
			remaining -= needed;
			this.tile = this.step.to;
			this.step = null;
			events.push({ type: "stepEnded", at: { ...this.tile } });
			// Chain into the next step on the same frame while a direction is held.
			if (!input.dir) break;
			events.push(...this.face(input.dir));
			if (!this.tryStart(input.run, canEnter, events)) break;
			if (remaining <= 0) return events;
		}
		if (this.step) return events;

		if (!input.dir) {
			this.turnHeldMs = null;
			this.bumpedDir = null;
			return events;
		}

		if (input.dir !== this.facing) {
			this.facing = input.dir;
			this.turnHeldMs = 0;
			this.bumpedDir = null;
			events.push({ type: "turned", facing: input.dir });
			return events;
		}

		if (this.turnHeldMs !== null) {
			this.turnHeldMs += remaining;
			if (this.turnHeldMs < this.config.turnDelayMs) return events;
			this.turnHeldMs = null;
		}
		this.tryStart(input.run, canEnter, events);
		return events;
	}

	private tryStart(run: boolean, canEnter: (p: Point) => boolean, events: MoverEvent[]): boolean {
		const to = neighbour(this.tile, this.facing);
		if (!canEnter(to)) {
			if (this.bumpedDir !== this.facing) events.push({ type: "bumped", facing: this.facing, into: to });
			this.bumpedDir = this.facing;
			return false;
		}
		this.bumpedDir = null;
		const from = { ...this.tile };
		this.step = { from, to, progress: 0, speed: run ? this.config.runSpeed : this.config.walkSpeed };
		events.push({ type: "stepStarted", from, to });
		return true;
	}
}
