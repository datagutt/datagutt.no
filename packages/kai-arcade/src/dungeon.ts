// A procedural dungeon, as on the old site: rooms joined by corridors, explored room by
// room by a hero with a torch through fog of war, knocking out the odd monster. The
// arrows take the hero over for a while; A builds a new dungeon.
import { GREENS, rng, SCREEN_BG, SCREEN_H, SCREEN_W, type ArcadeGame, type ArcadeInput } from "./types.ts";

const CELL = 4;
export const COLS = SCREEN_W / CELL;
export const ROWS = SCREEN_H / CELL;
const STEP_MS = 110;
const TORCH = 5;
/** How long the hero is yours after an arrow, before the autopilot takes back over. */
const MANUAL_MS = 4000;

export type Room = { x: number; y: number; w: number; h: number };

/** Rooms that don't overlap, joined in order by L-shaped corridors. `floor` is 1 where you can walk. */
export function generateDungeon(random: () => number): { floor: Uint8Array; rooms: Room[] } {
	const floor = new Uint8Array(COLS * ROWS);
	const rooms: Room[] = [];
	for (let tries = 0; tries < 200 && rooms.length < 9; tries++) {
		const w = 4 + Math.floor(random() * 6);
		const h = 3 + Math.floor(random() * 4);
		const room = { x: 1 + Math.floor(random() * (COLS - w - 2)), y: 1 + Math.floor(random() * (ROWS - h - 2)), w, h };
		if (rooms.some((r) => room.x < r.x + r.w + 1 && r.x < room.x + room.w + 1 && room.y < r.y + r.h + 1 && r.y < room.y + room.h + 1)) continue;
		rooms.push(room);
	}
	const dig = (x: number, y: number) => (floor[y * COLS + x] = 1);
	for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) dig(x, y);
	const centre = (r: Room) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });
	for (let i = 1; i < rooms.length; i++) {
		const a = centre(rooms[i - 1]);
		const b = centre(rooms[i]);
		for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) dig(x, a.y);
		for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) dig(b.x, y);
	}
	return { floor, rooms };
}

/** The first step on a shortest walk from `from` to `to`, or null when there is none. */
export function nextStep(floor: Uint8Array, from: number, to: number): number | null {
	if (from === to) return null;
	const came = new Int32Array(COLS * ROWS).fill(-1);
	came[from] = from;
	const queue = [from];
	while (queue.length) {
		const at = queue.shift()!;
		const x = at % COLS;
		for (const n of [at - COLS, at + COLS, x > 0 ? at - 1 : -1, x < COLS - 1 ? at + 1 : -1]) {
			if (n < 0 || n >= floor.length || !floor[n] || came[n] >= 0) continue;
			came[n] = at;
			if (n === to) {
				let step = n;
				while (came[step] !== from) step = came[step];
				return step;
			}
			queue.push(n);
		}
	}
	return null;
}

export class Dungeon implements ArcadeGame {
	readonly title = "Dungeon";
	readonly hint = "arrows: explore  A: new dungeon";
	private floor: Uint8Array = new Uint8Array(0);
	private rooms: Room[] = [];
	private seen = new Uint8Array(COLS * ROWS);
	private hero = 0;
	private target = 0;
	private monsters = new Set<number>();
	private stepMs = 0;
	private manualMs = 0;
	private readonly random: () => number;

	constructor(seed = Date.now()) {
		this.random = rng(seed);
		this.build();
	}

	private build(): void {
		({ floor: this.floor, rooms: this.rooms } = generateDungeon(this.random));
		this.seen.fill(0);
		const at = (r: Room) => (r.y + Math.floor(r.h / 2)) * COLS + r.x + Math.floor(r.w / 2);
		this.hero = at(this.rooms[0]);
		this.monsters = new Set(this.rooms.slice(1).map((r) => (r.y + Math.floor(this.random() * r.h)) * COLS + r.x + Math.floor(this.random() * r.w)));
		this.pickTarget();
		this.reveal();
	}

	private pickTarget(): void {
		const room = this.rooms[Math.floor(this.random() * this.rooms.length)];
		this.target = (room.y + Math.floor(room.h / 2)) * COLS + room.x + Math.floor(room.w / 2);
	}

	private reveal(): void {
		const hx = this.hero % COLS;
		const hy = Math.floor(this.hero / COLS);
		for (let y = hy - TORCH; y <= hy + TORCH; y++) {
			for (let x = hx - TORCH; x <= hx + TORCH; x++) {
				if (x >= 0 && y >= 0 && x < COLS && y < ROWS && Math.abs(x - hx) + Math.abs(y - hy) <= TORCH) this.seen[y * COLS + x] = 1;
			}
		}
	}

	private moveTo(cell: number): void {
		if (!this.floor[cell]) return;
		this.hero = cell;
		this.monsters.delete(cell);
		this.reveal();
	}

	step(dtMs: number, input: ArcadeInput): void {
		if (input.a) this.build();
		for (const dir of input.pressed) {
			this.manualMs = MANUAL_MS;
			const x = this.hero % COLS;
			const to = dir === "left" ? (x > 0 ? this.hero - 1 : -1) : dir === "right" ? (x < COLS - 1 ? this.hero + 1 : -1) : this.hero + (dir === "up" ? -COLS : COLS);
			if (to >= 0 && to < this.floor.length) this.moveTo(to);
		}
		if (this.manualMs > 0) {
			this.manualMs -= dtMs;
			return;
		}
		this.stepMs += dtMs;
		while (this.stepMs >= STEP_MS) {
			this.stepMs -= STEP_MS;
			const next = nextStep(this.floor, this.hero, this.target);
			if (next === null) this.pickTarget();
			else this.moveTo(next);
		}
		// The whole map explored: a new one.
		if (this.floor.every((f, i) => !f || this.seen[i])) this.build();
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = SCREEN_BG;
		ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
		const hx = this.hero % COLS;
		const hy = Math.floor(this.hero / COLS);
		for (let i = 0; i < this.floor.length; i++) {
			if (!this.seen[i]) continue;
			const x = i % COLS;
			const y = Math.floor(i / COLS);
			const lit = Math.abs(x - hx) + Math.abs(y - hy) <= TORCH;
			ctx.fillStyle = this.floor[i] ? GREENS[lit ? 3 : 1] : GREENS[0];
			ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
		}
		for (const m of this.monsters) {
			if (!this.seen[m]) continue;
			ctx.fillStyle = "#ff5a5a";
			ctx.fillRect((m % COLS) * CELL, Math.floor(m / COLS) * CELL, CELL - 1, CELL - 1);
		}
		ctx.fillStyle = GREENS[7];
		ctx.fillRect(hx * CELL, hy * CELL, CELL - 1, CELL - 1);
	}
}
