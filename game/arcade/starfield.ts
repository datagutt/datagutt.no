// A parallax starfield with pixel invaders drifting through, as on the old site. The
// arrows steer the flight; A sends a flare of new sprites. The same sky shows in the
// telescope on the radio hill at night (docs/game/PLAN.md B2).
import { GREENS, rng, SCREEN_BG, SCREEN_H, SCREEN_W, type ArcadeGame, type ArcadeInput } from "./types";

/** 5×5 sprites: an invader, a UFO, a small ship, an asteroid. */
const SPRITES = [
	"0101011111101011111110101",
	"0111011111101011111101010",
	"0010001110111111010101010",
	"0110011111111111111101100",
];
const LAYERS = [
	{ count: 60, speed: 6, color: GREENS[1] },
	{ count: 35, speed: 14, color: GREENS[3] },
	{ count: 18, speed: 28, color: GREENS[6] },
];

/** Real night-sky colours for the binoculars' view, one per layer, far to near. */
const NIGHT = ["#3a4a78", "#9fb3d9", "#fff7d6"];

type Star = { x: number; y: number; layer: number; twinkle: number };
type Sprite = { x: number; y: number; vx: number; vy: number; shape: number };

export class Starfield implements ArcadeGame {
	readonly title: string;
	readonly hint: string;
	private stars: Star[] = [];
	private sprites: Sprite[] = [];
	private heading = { x: -1, y: 0 };
	private readonly random: () => number;

	constructor(
		seed = Date.now(),
		/** Just the stars, slow and in their own colours: the binoculars on the radio hill. */
		private readonly quiet = false,
	) {
		this.title = quiet ? "The night sky" : "Starfield";
		this.hint = quiet ? "arrows: look around" : "arrows: steer  A: flare";
		this.random = rng(seed);
		if (quiet) this.heading = { x: -0.15, y: 0 };
		LAYERS.forEach((l, layer) => {
			for (let i = 0; i < l.count; i++) this.stars.push({ x: this.random() * SCREEN_W, y: this.random() * SCREEN_H, layer, twinkle: this.random() * 6 });
		});
	}

	private spawn(): void {
		this.sprites.push({
			x: this.heading.x < 0 ? SCREEN_W + 6 : -6,
			y: 10 + this.random() * (SCREEN_H - 25),
			vx: this.heading.x * (10 + this.random() * 15),
			vy: (this.random() - 0.5) * 6,
			shape: Math.floor(this.random() * SPRITES.length),
		});
	}

	step(dtMs: number, input: ArcadeInput): void {
		const turn = (dtMs / 1000) * 2;
		if (input.held.has("left")) this.heading.x = Math.max(-2, this.heading.x - turn);
		if (input.held.has("right")) this.heading.x = Math.min(2, this.heading.x + turn);
		if (input.held.has("up")) this.heading.y = Math.max(-1.5, this.heading.y - turn);
		if (input.held.has("down")) this.heading.y = Math.min(1.5, this.heading.y + turn);
		if (!this.quiet && input.a) for (let i = 0; i < 4; i++) this.spawn();
		const s = dtMs / 1000;
		for (const star of this.stars) {
			const { speed } = LAYERS[star.layer];
			star.x = (star.x + this.heading.x * speed * s + SCREEN_W) % SCREEN_W;
			star.y = (star.y + this.heading.y * speed * s + SCREEN_H) % SCREEN_H;
			star.twinkle += s * (1 + star.layer);
		}
		if (!this.quiet && this.random() < s / 2.5 && this.sprites.length < 5) this.spawn();
		for (const sp of this.sprites) {
			sp.x += sp.vx * s;
			sp.y += sp.vy * s;
		}
		this.sprites = this.sprites.filter((sp) => sp.x > -10 && sp.x < SCREEN_W + 10);
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = this.quiet ? "#050a18" : SCREEN_BG;
		ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
		for (const star of this.stars) {
			// Twinkling: now and then a star dims for a moment.
			if (Math.sin(star.twinkle) > 0.92) continue;
			ctx.fillStyle = this.quiet ? NIGHT[star.layer] : LAYERS[star.layer].color;
			ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1);
		}
		for (const sp of this.sprites) {
			ctx.fillStyle = GREENS[5];
			const bits = SPRITES[sp.shape];
			for (let i = 0; i < 25; i++) if (bits[i] === "1") ctx.fillRect(Math.floor(sp.x) + (i % 5), Math.floor(sp.y) + Math.floor(i / 5), 1, 1);
		}
	}
}
