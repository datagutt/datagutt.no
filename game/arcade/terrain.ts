// Drifting terrain in elevation bands, from deep water to snowy peaks, like the old
// site's noise canvas. The arrows fly over it; A raises a new island.
import { GREENS, rng, SCREEN_BG, SCREEN_H, SCREEN_W, type ArcadeGame, type ArcadeInput } from "./types";

const CELL = 4;
const COLS = SCREEN_W / CELL;
const ROWS = SCREEN_H / CELL;
/** Elevation (0..1) where each band starts, with its colour. */
const BANDS: [number, string][] = [
	[0, "#06243a"],
	[0.3, "#0b3a55"],
	[0.42, GREENS[1]],
	[0.52, GREENS[3]],
	[0.64, GREENS[4]],
	[0.76, GREENS[5]],
	[0.86, "#e8f5ef"],
];

/** Smooth value noise on a lattice, in 0..1. */
export function valueNoise(seed: number, x: number, y: number): number {
	const hash = (ix: number, iy: number) => {
		const s = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453;
		return s - Math.floor(s);
	};
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ease = (t: number) => t * t * (3 - 2 * t);
	const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * ease(fx);
	const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * ease(fx);
	return top + (bottom - top) * ease(fy);
}

export class Terrain implements ArcadeGame {
	readonly title = "Terrain";
	readonly hint = "arrows: fly  A: new island";
	private seed: number;
	private readonly random: () => number;
	private view = { x: 0, y: 0 };

	constructor(seed = Date.now()) {
		this.random = rng(seed);
		this.seed = Math.floor(this.random() * 1000);
	}

	private height(x: number, y: number): number {
		let h = 0;
		let amp = 0.55;
		let freq = 0.06;
		for (let octave = 0; octave < 4; octave++) {
			h += valueNoise(this.seed + octave, x * freq, y * freq) * amp;
			amp /= 2;
			freq *= 2;
		}
		return h;
	}

	step(dtMs: number, input: ArcadeInput): void {
		if (input.a) this.seed = Math.floor(this.random() * 1000);
		const speed = (dtMs / 1000) * 6;
		// A slow drift of its own, steered by the arrows.
		this.view.x += speed * (0.3 + (input.held.has("right") ? 2 : 0) - (input.held.has("left") ? 2.3 : 0));
		this.view.y += speed * (0.1 + (input.held.has("down") ? 2 : 0) - (input.held.has("up") ? 2.1 : 0));
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = SCREEN_BG;
		ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const h = this.height(x + this.view.x, y + this.view.y);
				let color = BANDS[0][1];
				for (const [from, c] of BANDS) if (h >= from) color = c;
				ctx.fillStyle = color;
				ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
			}
		}
	}
}
