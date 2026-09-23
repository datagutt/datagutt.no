// Season effects outdoors (docs/game/PLAN.md M5.4): snow and a frosty rim in winter, petals
// in spring, pollen in summer, leaves in autumn. Particles fall across the screen, under
// the time-of-day tint (fx/DayNight.ts) so they darken at night like everything else.
// Reduced motion keeps the effect but thins it out and stops the tumbling.
import Phaser from "phaser";
import type { Season } from "../world/season";
import { LIGHT_DEPTH } from "./Lights";

const DEPTH = LIGHT_DEPTH - 2;
/** How strong the winter frost rim is by day. */
const FROST = 0.2;

/** Pixel art for each particle: rows of palette indices, 0 transparent. */
type Sprite = { key: string; palette: string[]; rows: string[] };
const SPRITES: Record<Season, Sprite> = {
	winter: { key: "fx:snow", palette: ["f4f8ff", "c9d6ee"], rows: ["12", "21"] },
	spring: { key: "fx:petal", palette: ["ffc2d8", "f58fb5"], rows: ["11", "12"] },
	summer: { key: "fx:pollen", palette: ["fff2a8"], rows: ["1"] },
	autumn: { key: "fx:leaf", palette: ["e0902c", "b0561f"], rows: ["011", "122"] },
};

type Motion = { every: number; life: number; fallY: [number, number]; driftX: [number, number]; spin: boolean; wholeScreen: boolean; alpha: number };
const MOTION: Record<Season, Motion> = {
	winter: { every: 70, life: 9000, fallY: [18, 34], driftX: [-8, 6], spin: false, wholeScreen: false, alpha: 0.9 },
	spring: { every: 420, life: 9000, fallY: [12, 22], driftX: [6, 18], spin: true, wholeScreen: false, alpha: 0.9 },
	summer: { every: 260, life: 4000, fallY: [-4, 4], driftX: [-5, 5], spin: false, wholeScreen: true, alpha: 0.7 },
	autumn: { every: 380, life: 10000, fallY: [14, 26], driftX: [4, 16], spin: true, wholeScreen: false, alpha: 1 },
};

function bake(scene: Phaser.Scene, { key, palette, rows }: Sprite): void {
	if (scene.textures.exists(key)) return;
	const canvas = scene.textures.createCanvas(key, rows[0].length, rows.length)!;
	const ctx = canvas.getContext();
	rows.forEach((row, y) =>
		[...row].forEach((c, x) => {
			if (c === "0") return;
			ctx.fillStyle = `#${palette[Number(c) - 1]}`;
			ctx.fillRect(x, y, 1, 1);
		}),
	);
	canvas.refresh();
}

export class Weather {
	private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
	private frost: Phaser.Filters.Vignette | null = null;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly season: Season,
		private readonly reducedMotion: boolean,
	) {
		bake(scene, SPRITES[season]);
		const cam = scene.cameras.main;
		this.start(cam.width, cam.height);
		// A cold, pale rim round the screen in winter.
		if (season === "winter") this.frost = cam.filters.internal.addVignette(0.5, 0.5, 0.9, FROST, 0xdde8f8);
	}

	/** The pale frost would glow in the dark: it fades as night falls. */
	update(dark: number): void {
		if (this.frost) this.frost.strength = FROST * (1 - 0.8 * dark);
	}

	/** A new size means a new spread of particles. */
	resize(width: number, height: number): void {
		this.emitter?.destroy();
		this.start(width, height);
	}

	destroy(): void {
		this.emitter?.destroy();
		if (this.frost) this.scene.cameras.main.filters.internal.remove(this.frost);
	}

	private start(width: number, height: number): void {
		const m = MOTION[this.season];
		const calm = this.reducedMotion;
		this.emitter = this.scene.add
			.particles(0, 0, SPRITES[this.season].key, {
				x: { min: -16, max: width + 16 },
				y: m.wholeScreen ? { min: 0, max: height } : { min: -8, max: -2 },
				lifespan: m.life,
				speedY: { min: m.fallY[0], max: m.fallY[1] },
				speedX: { min: m.driftX[0], max: m.driftX[1] },
				rotate: m.spin && !calm ? { start: 0, end: 360 } : 0,
				alpha: m.wholeScreen ? { start: m.alpha, end: 0 } : m.alpha,
				frequency: calm ? m.every * 3 : m.every,
				quantity: 1,
			})
			.setScrollFactor(0)
			.setDepth(DEPTH);
		// Start mid-fall rather than with an empty sky.
		this.emitter.fastForward(m.life);
	}
}
