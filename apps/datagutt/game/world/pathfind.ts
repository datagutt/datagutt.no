// A* on the tile grid for tap/click-to-move (docs/game/PLAN.md M1.8). 4-directional,
// with a small penalty for turning so paths prefer long straight runs, which reads as
// deliberate walking rather than zig-zagging.
import type { Point } from "./grid";

export type Walkable = { width: number; height: number; isWalkable(x: number, y: number): boolean };

export type PathOptions = {
	/** Give up after expanding this many tiles (keeps a far-off tap from stalling a frame). */
	maxExpanded?: number;
	/** Extra cost for changing direction. */
	turnCost?: number;
};

const DIRS = [
	[1, 0],
	[0, -1],
	[-1, 0],
	[0, 1],
] as const;

/** Binary min-heap of node indices keyed by f-score. */
class Heap {
	private items: number[] = [];
	constructor(private readonly score: Float64Array) {}
	get size() {
		return this.items.length;
	}
	push(n: number) {
		const items = this.items;
		items.push(n);
		let i = items.length - 1;
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (this.score[items[parent]] <= this.score[items[i]]) break;
			[items[parent], items[i]] = [items[i], items[parent]];
			i = parent;
		}
	}
	pop(): number {
		const items = this.items;
		const top = items[0];
		const last = items.pop()!;
		if (items.length) {
			items[0] = last;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1;
				const r = l + 1;
				let m = i;
				if (l < items.length && this.score[items[l]] < this.score[items[m]]) m = l;
				if (r < items.length && this.score[items[r]] < this.score[items[m]]) m = r;
				if (m === i) break;
				[items[m], items[i]] = [items[i], items[m]];
				i = m;
			}
		}
		return top;
	}
}

/**
 * Shortest path from `from` to `to`, excluding `from` and including `to`.
 * Returns [] when already there and null when unreachable.
 */
export function findPath(grid: Walkable, from: Point, to: Point, options: PathOptions = {}): Point[] | null {
	const { maxExpanded = 4000, turnCost = 0.01 } = options;
	if (from.x === to.x && from.y === to.y) return [];
	if (!grid.isWalkable(to.x, to.y)) return null;

	const w = grid.width;
	const size = w * grid.height;
	// State is (tile, arrival direction) so turn costs are exact.
	const states = size * 4;
	const g = new Float64Array(states).fill(Infinity);
	const f = new Float64Array(states).fill(Infinity);
	const came = new Int32Array(states).fill(-1);
	const closed = new Uint8Array(states);
	const heap = new Heap(f);
	const h = (x: number, y: number) => Math.abs(x - to.x) + Math.abs(y - to.y);

	for (let d = 0; d < 4; d++) {
		const s = (from.y * w + from.x) * 4 + d;
		g[s] = 0;
		f[s] = h(from.x, from.y);
	}
	// Start with no preferred direction: seed a single state; the others stay unreached.
	const start = (from.y * w + from.x) * 4;
	heap.push(start);

	let expanded = 0;
	while (heap.size) {
		const s = heap.pop();
		if (closed[s]) continue;
		closed[s] = 1;
		const tile = s >> 2;
		const dir = s & 3;
		const x = tile % w;
		const y = (tile - x) / w;

		if (x === to.x && y === to.y) {
			const path: Point[] = [];
			let cur = s;
			while (cur !== start && cur !== -1) {
				const t = cur >> 2;
				path.push({ x: t % w, y: Math.floor(t / w) });
				cur = came[cur];
			}
			return path.reverse();
		}
		if (++expanded > maxExpanded) return null;

		for (let nd = 0; nd < 4; nd++) {
			const nx = x + DIRS[nd][0];
			const ny = y + DIRS[nd][1];
			if (nx < 0 || ny < 0 || nx >= w || ny >= grid.height || !grid.isWalkable(nx, ny)) continue;
			const ns = (ny * w + nx) * 4 + nd;
			if (closed[ns]) continue;
			const turned = s !== start && nd !== dir;
			const cost = g[s] + 1 + (turned ? turnCost : 0);
			if (cost < g[ns]) {
				g[ns] = cost;
				f[ns] = cost + h(nx, ny);
				came[ns] = s;
				heap.push(ns);
			}
		}
	}
	return null;
}

/**
 * Path to stand next to `target` (to talk to an NPC or read a sign), picking the
 * shortest of the reachable neighbouring tiles. Returns the path and the tile to face.
 */
export function findPathAdjacent(grid: Walkable, from: Point, target: Point, options?: PathOptions): Point[] | null {
	let best: Point[] | null = null;
	for (const [dx, dy] of DIRS) {
		const spot = { x: target.x + dx, y: target.y + dy };
		const path = spot.x === from.x && spot.y === from.y ? [] : findPath(grid, from, spot, options);
		if (path && (best === null || path.length < best.length)) best = path;
	}
	return best;
}
