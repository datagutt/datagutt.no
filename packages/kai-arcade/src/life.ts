// Conway's Game of Life with the old site's data pulses: bright lines running across the
// grid. A reseeds, the arrows move a cursor that sows life where it goes. Without its
// cursor it also works as a screensaver.
import { GREENS, rng, SCREEN_BG, SCREEN_H, SCREEN_W, type ArcadeGame, type ArcadeInput } from "./types.ts";

const CELL = 4;
const COLS = SCREEN_W / CELL;
const ROWS = SCREEN_H / CELL;
const TICK_MS = 160;

/** One generation: born with 3 neighbours, survives with 2 or 3. The grid wraps. */
export function lifeStep(cells: Uint8Array, cols: number, rows: number): Uint8Array {
	const next = new Uint8Array(cells.length);
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			let n = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx || dy) n += cells[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
				}
			}
			const alive = cells[y * cols + x];
			next[y * cols + x] = n === 3 || (alive && n === 2) ? 1 : 0;
		}
	}
	return next;
}

type Pulse = { row: number; head: number; speed: number; dir: 1 | -1 };

export class Life implements ArcadeGame {
	readonly title: string;
	readonly hint: string;
	private cells: Uint8Array = new Uint8Array(COLS * ROWS);
	/** How long each cell has been alive, for its brightness. */
	private age = new Uint8Array(COLS * ROWS);
	private pulses: Pulse[] = [];
	private tickMs = 0;
	private cursor = { x: COLS / 2, y: ROWS / 2 };
	private readonly random: () => number;

	constructor(
		seed = Date.now(),
		/** The cursor is for the cabinet; the PC's screensaver has none. */
		private readonly withCursor = true,
	) {
		this.title = withCursor ? "Life" : "Screensaver";
		this.hint = withCursor ? "A: reseed  arrows: sow" : "A: new pattern";
		this.random = rng(seed);
		this.seed();
	}

	private seed(): void {
		for (let i = 0; i < this.cells.length; i++) this.cells[i] = this.random() < 0.22 ? 1 : 0;
		this.age.fill(0);
	}

	step(dtMs: number, input: ArcadeInput): void {
		if (input.a) this.seed();
		if (this.withCursor) {
			for (const dir of input.pressed) {
				this.cursor.x = (this.cursor.x + (dir === "left" ? -1 : dir === "right" ? 1 : 0) + COLS) % COLS;
				this.cursor.y = (this.cursor.y + (dir === "up" ? -1 : dir === "down" ? 1 : 0) + ROWS) % ROWS;
			}
			if (input.held.size) {
				// A glider-sized splash of life round the cursor.
				for (const [dx, dy] of [[0, 0], [1, 0], [-1, 1], [0, 1], [0, -1]]) {
					this.cells[((this.cursor.y + dy + ROWS) % ROWS) * COLS + ((this.cursor.x + dx + COLS) % COLS)] = 1;
				}
			}
		}
		this.tickMs += dtMs;
		while (this.tickMs >= TICK_MS) {
			this.tickMs -= TICK_MS;
			this.cells = lifeStep(this.cells, COLS, ROWS);
			for (let i = 0; i < this.cells.length; i++) this.age[i] = this.cells[i] ? Math.min(255, this.age[i] + 1) : 0;
			// A dying world is sown again at random, as the old canvas did.
			if (this.cells.reduce((a, b) => a + b, 0) < 40) for (let i = 0; i < 60; i++) this.cells[Math.floor(this.random() * this.cells.length)] = 1;
		}
		if (this.random() < dtMs / 900) {
			const dir = this.random() < 0.5 ? 1 : -1;
			this.pulses.push({ row: Math.floor(this.random() * ROWS), head: dir === 1 ? -4 : COLS + 4, speed: 12 + this.random() * 18, dir });
		}
		for (const p of this.pulses) p.head += (p.dir * p.speed * dtMs) / 1000;
		this.pulses = this.pulses.filter((p) => p.head > -12 && p.head < COLS + 12);
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = SCREEN_BG;
		ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const i = y * COLS + x;
				if (!this.cells[i]) continue;
				ctx.fillStyle = GREENS[Math.min(6, 2 + Math.floor(this.age[i] / 3))];
				ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
			}
		}
		for (const p of this.pulses) {
			for (let t = 0; t < 6; t++) {
				const x = Math.round(p.head) - t * p.dir;
				if (x < 0 || x >= COLS) continue;
				ctx.fillStyle = GREENS[7 - Math.min(4, t)];
				ctx.fillRect(x * CELL, p.row * CELL, CELL - 1, CELL - 1);
			}
		}
		if (this.withCursor) {
			ctx.strokeStyle = GREENS[7];
			ctx.lineWidth = 1;
			ctx.strokeRect(this.cursor.x * CELL - 0.5, this.cursor.y * CELL - 0.5, CELL, CELL);
		}
	}
}
