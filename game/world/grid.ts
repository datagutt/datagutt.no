import type { Facing } from "./objects";

export type Point = { x: number; y: number };

export const STEP: Record<Facing, Point> = {
	right: { x: 1, y: 0 },
	up: { x: 0, y: -1 },
	left: { x: -1, y: 0 },
	down: { x: 0, y: 1 },
};

export function neighbour(p: Point, dir: Facing): Point {
	return { x: p.x + STEP[dir].x, y: p.y + STEP[dir].y };
}

/** Direction of a single orthogonal step from `a` to `b`, or null if they are not adjacent. */
export function directionBetween(a: Point, b: Point): Facing | null {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
	if (dx === 1) return "right";
	if (dx === -1) return "left";
	return dy === 1 ? "down" : "up";
}

/**
 * Which tiles can be walked on. Static blocking comes from the map; occupants (NPCs,
 * the player) are tracked separately so they can move without rebuilding anything.
 */
export class CollisionGrid {
	readonly width: number;
	readonly height: number;
	private readonly blocked: Uint8Array;
	private readonly occupants = new Map<number, string>();

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.blocked = new Uint8Array(width * height);
	}

	private index(x: number, y: number): number {
		return y * this.width + x;
	}

	inBounds(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	}

	setBlocked(x: number, y: number, blocked = true): void {
		if (this.inBounds(x, y)) this.blocked[this.index(x, y)] = blocked ? 1 : 0;
	}

	isStaticBlocked(x: number, y: number): boolean {
		return !this.inBounds(x, y) || this.blocked[this.index(x, y)] === 1;
	}

	occupy(x: number, y: number, who: string): void {
		this.occupants.set(this.index(x, y), who);
	}

	vacate(x: number, y: number, who: string): void {
		const i = this.index(x, y);
		if (this.occupants.get(i) === who) this.occupants.delete(i);
	}

	occupantAt(x: number, y: number): string | undefined {
		return this.inBounds(x, y) ? this.occupants.get(this.index(x, y)) : undefined;
	}

	/** Walkable for `who`: in bounds, not a wall, and not taken by someone else. */
	isWalkable(x: number, y: number, who?: string): boolean {
		if (this.isStaticBlocked(x, y)) return false;
		const occupant = this.occupantAt(x, y);
		return occupant === undefined || occupant === who;
	}
}
