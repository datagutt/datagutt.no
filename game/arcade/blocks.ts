// Falling blocks: the one cabinet you can really play. The old site's canvas dropped
// pieces by itself; that is the attract mode here, until A starts a game. Left and
// right move, up rotates, down drops faster, A drops at once. Lines score by level.
import { drawText, textWidth } from "./digits";
import { GREENS, rng, SCREEN_BG, SCREEN_H, SCREEN_W, type ArcadeGame, type ArcadeInput } from "./types";

export const COLS = 10;
export const ROWS = 20;
const CELL = 5;
const BOARD_X = 55;
const BOARD_Y = 10;

/** Pieces as cells [x, y] in a 4×4 box, one list per rotation. */
const SHAPES: [number, number][][][] = [
	[[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]], // I
	[[[1, 0], [2, 0], [1, 1], [2, 1]]], // O
	[[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]], // T
	[[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]]], // S
	[[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]]], // Z
	[[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]], // L
	[[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]], // J
];
const PIECE_COLORS = [GREENS[5], GREENS[3], GREENS[6], GREENS[4], GREENS[2], GREENS[7], GREENS[4]];
/** Points for 1 to 4 lines at once, times the level. */
const LINE_POINTS = [0, 40, 100, 300, 1200];

export type Piece = { shape: number; rotation: number; x: number; y: number };

/** The rules, apart from drawing and timing. Cells hold a shape index, or -1. */
export class Board {
	readonly cells: number[][] = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(-1));

	cellsOf(p: Piece): [number, number][] {
		const rotations = SHAPES[p.shape];
		return rotations[p.rotation % rotations.length].map(([cx, cy]) => [p.x + cx, p.y + cy]);
	}

	fits(p: Piece): boolean {
		return this.cellsOf(p).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || this.cells[y][x] < 0));
	}

	/** Turn clockwise, nudging one or two cells sideways off a wall if that is what it takes. */
	rotate(p: Piece): Piece | null {
		for (const kick of [0, -1, 1, -2, 2]) {
			const turned = { ...p, rotation: p.rotation + 1, x: p.x + kick };
			if (this.fits(turned)) return turned;
		}
		return null;
	}

	/** Fix the piece in place and clear full rows. Returns how many rows went, or -1 if it locked above the top. */
	lock(p: Piece): number {
		let above = false;
		for (const [x, y] of this.cellsOf(p)) {
			if (y < 0) above = true;
			else this.cells[y][x] = p.shape;
		}
		let cleared = 0;
		for (let y = ROWS - 1; y >= 0; y--) {
			if (this.cells[y].every((c) => c >= 0)) {
				this.cells.splice(y, 1);
				this.cells.unshift(Array<number>(COLS).fill(-1));
				cleared++;
				y++;
			}
		}
		return above ? -1 : cleared;
	}
}

export const linePoints = (lines: number, level: number) => LINE_POINTS[lines] * level;
/** Milliseconds per row: faster each level, never below 60. */
export const fallDelay = (level: number) => Math.max(60, 700 - (level - 1) * 60);

type Mode = "attract" | "playing" | "over";

export class FallingBlocks implements ArcadeGame {
	readonly title = "Falling blocks";
	readonly hint = "A: start / drop  up: turn";
	private board = new Board();
	private mode: Mode = "attract";
	private piece: Piece;
	private next: number;
	private fallMs = 0;
	private repeatMs = 0;
	private overMs = 0;
	private score = 0;
	private lines = 0;
	private readonly random: () => number;

	constructor(
		/** The best score so far, kept in the save. */
		private high: number,
		/** Called with a new best score when a game ends. */
		private readonly onHighScore: (score: number) => void,
		seed = Date.now(),
	) {
		this.random = rng(seed);
		this.next = this.pick();
		this.piece = this.spawn();
	}

	get level(): number {
		return 1 + Math.floor(this.lines / 10);
	}

	private pick(): number {
		return Math.floor(this.random() * SHAPES.length);
	}

	private spawn(): Piece {
		const piece = { shape: this.next, rotation: 0, x: 3, y: -1 };
		this.next = this.pick();
		return piece;
	}

	private start(): void {
		this.board = new Board();
		this.score = 0;
		this.lines = 0;
		this.mode = "playing";
		this.piece = this.spawn();
	}

	step(dtMs: number, input: ArcadeInput): void {
		if (this.mode === "over") {
			this.overMs += dtMs;
			if (this.overMs > 800 && input.a) this.start();
			else if (this.overMs > 6000) this.mode = "attract";
			return;
		}
		if (this.mode === "attract") {
			if (input.a) return this.start();
			this.autoplay(dtMs);
			return;
		}

		if (input.pressed.has("up")) this.piece = this.board.rotate(this.piece) ?? this.piece;
		for (const dir of ["left", "right"] as const) {
			if (input.pressed.has(dir)) {
				this.shift(dir === "left" ? -1 : 1);
				this.repeatMs = -150;
			}
		}
		// Holding left or right slides, after a short pause.
		const held = input.held.has("left") ? -1 : input.held.has("right") ? 1 : 0;
		if (held && !input.pressed.has("left") && !input.pressed.has("right")) {
			this.repeatMs += dtMs;
			while (this.repeatMs >= 60) {
				this.shift(held);
				this.repeatMs -= 60;
			}
		}
		if (input.a) {
			while (this.board.fits({ ...this.piece, y: this.piece.y + 1 })) {
				this.piece = { ...this.piece, y: this.piece.y + 1 };
				this.score += 2;
			}
			this.settle();
			return;
		}
		this.fallMs += dtMs * (input.held.has("down") ? 8 : 1);
		while (this.fallMs >= fallDelay(this.level) && this.mode === "playing") {
			this.fallMs -= fallDelay(this.level);
			if (this.board.fits({ ...this.piece, y: this.piece.y + 1 })) this.piece = { ...this.piece, y: this.piece.y + 1 };
			else this.settle();
		}
	}

	private shift(dx: number): void {
		const moved = { ...this.piece, x: this.piece.x + dx };
		if (this.board.fits(moved)) this.piece = moved;
	}

	private settle(): void {
		const cleared = this.board.lock(this.piece);
		if (cleared < 0 || !this.board.fits((this.piece = this.spawn()))) return this.gameOver();
		this.score += linePoints(cleared, this.level);
		this.lines += cleared;
		this.fallMs = 0;
	}

	private gameOver(): void {
		this.mode = "over";
		this.overMs = 0;
		if (this.score > this.high) {
			this.high = this.score;
			this.onHighScore(this.score);
		}
	}

	/** The attract mode: pieces fall at a steady pace, turned and placed at random. */
	private autoplay(dtMs: number): void {
		this.fallMs += dtMs;
		while (this.fallMs >= 120) {
			this.fallMs -= 120;
			if (this.piece.y === -1) {
				for (let i = Math.floor(this.random() * 4); i > 0; i--) this.piece = this.board.rotate(this.piece) ?? this.piece;
				this.shift(Math.floor(this.random() * 9) - 4);
				this.shift(Math.floor(this.random() * 9) - 4);
			}
			if (this.board.fits({ ...this.piece, y: this.piece.y + 1 })) this.piece = { ...this.piece, y: this.piece.y + 1 };
			else if (this.board.lock(this.piece) < 0 || !this.board.fits((this.piece = this.spawn()))) this.board = new Board();
		}
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = SCREEN_BG;
		ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
		ctx.fillStyle = GREENS[0];
		ctx.fillRect(BOARD_X - 2, BOARD_Y - 2, COLS * CELL + 4, ROWS * CELL + 4);
		ctx.fillStyle = SCREEN_BG;
		ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
		const cell = (x: number, y: number, shape: number) => {
			if (y < 0) return;
			ctx.fillStyle = PIECE_COLORS[shape];
			ctx.fillRect(BOARD_X + x * CELL, BOARD_Y + y * CELL, CELL - 1, CELL - 1);
		};
		this.board.cells.forEach((row, y) => row.forEach((shape, x) => shape >= 0 && cell(x, y, shape)));
		if (this.mode !== "over") for (const [x, y] of this.board.cellsOf(this.piece)) cell(x, y, this.piece.shape);

		drawText(ctx, "SCORE", 112, 12, GREENS[4]);
		drawText(ctx, String(this.score), 112, 20, GREENS[7]);
		drawText(ctx, "BEST", 112, 34, GREENS[4]);
		drawText(ctx, String(Math.max(this.high, this.score)), 112, 42, GREENS[7]);
		drawText(ctx, "LEVEL", 112, 56, GREENS[4]);
		drawText(ctx, String(this.level), 112, 64, GREENS[7]);
		drawText(ctx, "NEXT", 112, 78, GREENS[4]);
		for (const [cx, cy] of SHAPES[this.next][0]) {
			ctx.fillStyle = PIECE_COLORS[this.next];
			ctx.fillRect(114 + cx * CELL, 88 + cy * CELL, CELL - 1, CELL - 1);
		}
		drawText(ctx, "LINES", 8, 12, GREENS[4]);
		drawText(ctx, String(this.lines), 8, 20, GREENS[7]);

		const banner = this.mode === "attract" ? "PRESS A" : this.mode === "over" ? "GAME OVER" : "";
		if (banner) {
			const w = textWidth(banner, 1);
			ctx.fillStyle = SCREEN_BG;
			ctx.fillRect(BOARD_X + (COLS * CELL - w) / 2 - 3, 52, w + 6, 11);
			drawText(ctx, banner, BOARD_X + (COLS * CELL - w) / 2, 55, GREENS[7]);
		}
	}
}
