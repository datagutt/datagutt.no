// Fake visitors for `?debug&ghosts=<n>` (docs/game/PLAN.md M4.4: smooth with 20 ghosts on
// a phone). They join around the player and wander one tile at a time, fed to the ghost
// layer as if the room had sent them.
import type { CollisionGrid, Point } from "../world/grid";
import type { Facing } from "@datagutt/kai/world/objects";
import type { ServerMessage } from "@datagutt/kai-net/protocol";

const STEP_MS = [250, 900] as const;
const DIRS: [Facing, number, number][] = [["right", 1, 0], ["left", -1, 0], ["down", 0, 1], ["up", 0, -1]];

export class SimulatedGhosts {
	private readonly ghosts: { id: string; x: number; y: number; wait: number }[] = [];

	constructor(
		count: number,
		around: Point,
		private readonly grid: CollisionGrid,
		private readonly deliver: (message: ServerMessage) => void,
	) {
		for (let i = 0; i < count; i++) {
			const at = this.freeNear(around, 6);
			const id = `sim${i}`;
			this.ghosts.push({ id, ...at, wait: Math.random() * STEP_MS[1] });
			deliver({ t: "joined", ghost: { id, name: `Test ghost ${i + 1}`, tint: ["9ad6ff", "ffb870", "b5ead7", "ffb3e6"][i % 4], ...at, facing: "down" } });
		}
	}

	update(dtMs: number): void {
		for (const g of this.ghosts) {
			if ((g.wait -= dtMs) > 0) continue;
			g.wait = STEP_MS[0] + Math.random() * (STEP_MS[1] - STEP_MS[0]);
			const [facing, dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)];
			if (this.grid.isStaticBlocked(g.x + dx, g.y + dy)) continue;
			g.x += dx;
			g.y += dy;
			this.deliver({ t: "moved", id: g.id, x: g.x, y: g.y, facing });
		}
	}

	private freeNear(p: Point, radius: number): Point {
		for (let tries = 0; tries < 50; tries++) {
			const x = p.x + Math.round((Math.random() * 2 - 1) * radius);
			const y = p.y + Math.round((Math.random() * 2 - 1) * radius);
			if (!this.grid.isStaticBlocked(x, y)) return { x, y };
		}
		return { ...p };
	}
}
