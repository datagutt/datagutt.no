// The sky outdoors: the season's particles (docs/game/PLAN.md M5.4: snow and a frosty rim
// in winter, petals in spring, pollen in summer, leaves in autumn) and Oslo's real weather
// (C2: rain, sleet, snow, fog, storms; world/weather.ts decides what shows). Everything
// sits under the time-of-day tint (fx/DayNight.ts), so it darkens at night like the rest,
// except the lightning, which lights the town up. Reduced motion keeps the weather but
// thins it out, stops the tumbling and the fog's drift, and never flashes. Low effects
// quality thins it too and drops the frost, the splashes and one of the fog's layers.
import Phaser from "phaser";
import type { WeatherNow } from "../world/weather-kinds.ts";
import type { Season } from "../world/season.ts";
import { skyFor, type FallKind, type Sky } from "../world/weather.ts";
import { LIGHT_DEPTH } from "./Lights.ts";

const DEPTH = LIGHT_DEPTH - 2;
const FOG_DEPTH = LIGHT_DEPTH - 3;
const OVERCAST_DEPTH = LIGHT_DEPTH - 4;
/** Over the day/night tint and the aurora, under the speech bubbles' labels and the UI. */
const FLASH_DEPTH = LIGHT_DEPTH + 1.5;
/** How strong the winter frost rim is by day. */
const FROST = 0.2;

/** Pixel art for each particle: rows of palette indices, 0 transparent. */
type Sprite = { key: string; palette: string[]; rows: string[] };
const SNOW: Sprite = { key: "fx:snow", palette: ["f4f8ff", "c9d6ee"], rows: ["12", "21"] };
/** Rain is drawn to fit the wind (bakeStreak); everything else is one of these. */
const SPRITES: Record<Season | "snow", Sprite> = {
	snow: SNOW,
	winter: SNOW,
	spring: { key: "fx:petal", palette: ["ffc2d8", "f58fb5"], rows: ["11", "12"] },
	summer: { key: "fx:pollen", palette: ["fff2a8"], rows: ["1"] },
	autumn: { key: "fx:leaf", palette: ["e0902c", "b0561f"], rows: ["011", "122"] },
};
const SPLASH: Sprite = { key: "fx:splash", palette: ["c4d8ea"], rows: ["101", "010"] };

type Motion = {
	every: number;
	life: [number, number];
	fallY: [number, number];
	driftX: [number, number];
	spin: boolean;
	/** Born anywhere in view (pollen hangs in the air; rain lands everywhere you look). */
	wholeScreen: boolean;
	alpha: number;
	/** How much the wind carries it, 0 to 1. */
	windy: number;
	/** Rain: a streak this many pixels long, falling straight along the wind; 0 for the rest. */
	streak: number;
};
const MOTION: Record<FallKind, Motion> = {
	winter: { every: 70, life: [9000, 9000], fallY: [18, 34], driftX: [-8, 6], spin: false, wholeScreen: false, alpha: 0.9, windy: 0.6, streak: 0 },
	spring: { every: 420, life: [9000, 9000], fallY: [12, 22], driftX: [6, 18], spin: true, wholeScreen: false, alpha: 0.9, windy: 0.8, streak: 0 },
	summer: { every: 260, life: [4000, 4000], fallY: [-4, 4], driftX: [-5, 5], spin: false, wholeScreen: true, alpha: 0.7, windy: 0.3, streak: 0 },
	autumn: { every: 380, life: [10000, 10000], fallY: [14, 26], driftX: [4, 16], spin: true, wholeScreen: false, alpha: 1, windy: 0.8, streak: 0 },
	snow: { every: 35, life: [9000, 9000], fallY: [20, 38], driftX: [-8, 6], spin: false, wholeScreen: false, alpha: 0.95, windy: 0.7, streak: 0 },
	rain: { every: 6, life: [450, 850], fallY: [190, 240], driftX: [0, 0], spin: false, wholeScreen: true, alpha: 0.7, windy: 1, streak: 5 },
	heavyRain: { every: 2.5, life: [350, 750], fallY: [250, 310], driftX: [0, 0], spin: false, wholeScreen: true, alpha: 0.75, windy: 1, streak: 7 },
};

/** Grey over a wet day; pale over snow and fog. */
const OVERCAST_GREY = 0x5e6876;
const OVERCAST_PALE = 0xd4dce4;
const FOG_TINT = 0xe6ecf2;
/** Fog layers: texture scale, drift (px/s) and opacity. Low quality keeps the first. */
const FOG_LAYERS = [
	{ scale: 2, speed: 5, alpha: 0.5 },
	{ scale: 3, speed: 9, alpha: 0.35 },
];
/** Seconds between lightning flashes: at least, plus up to. */
const FLASH_EVERY: [number, number] = [7, 16];
/** The flash's brightness through its ~half second: a flicker, then a fade. */
const FLASH_STEPS: [number, number][] = [
	[0, 1],
	[70, 0.25],
	[140, 0.8],
	[220, 0.6],
	[520, 0],
];

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

/** A raindrop's streak, slanted as far as the wind pushes it: pale tail, brighter head. */
function bakeStreak(scene: Phaser.Scene, length: number, slope: number): string {
	const dx = Math.round((length - 1) * slope);
	const key = `fx:rain:${length}:${dx}`;
	if (scene.textures.exists(key)) return key;
	const width = Math.abs(dx) + 1;
	const canvas = scene.textures.createCanvas(key, width, length)!;
	const ctx = canvas.getContext();
	for (let y = 0; y < length; y++) {
		ctx.fillStyle = y >= length - 2 ? "#f2f8ff" : "#c2d6ea";
		ctx.fillRect((dx < 0 ? width - 1 : 0) + Math.round(y * slope), y, 1, 1);
	}
	canvas.refresh();
	return key;
}

/** A tile of fog that repeats seamlessly: soft blobs, in a few flat steps of opacity. */
function bakeFog(scene: Phaser.Scene): string {
	const key = "fx:fog";
	if (scene.textures.exists(key)) return key;
	const size = 96;
	const blobs = Array.from({ length: 10 }, () => ({ x: Math.random() * size, y: Math.random() * size, r: 8 + Math.random() * 14 }));
	const canvas = scene.textures.createCanvas(key, size, size)!;
	const ctx = canvas.getContext();
	const image = ctx.createImageData(size, size);
	const wrap = (d: number) => Math.min(Math.abs(d), size - Math.abs(d));
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const density = blobs.reduce((sum, b) => sum + Math.exp(-(wrap(x - b.x) ** 2 + wrap(y - b.y) ** 2) / (b.r * b.r)), 0);
			// Thin places clear completely, so the fog comes in banks with gaps between.
			const alpha = Math.floor(Math.max(0, Math.min(1, density - 0.25)) * 4) / 4;
			const i = (y * size + x) * 4;
			image.data.set([(FOG_TINT >> 16) & 0xff, (FOG_TINT >> 8) & 0xff, FOG_TINT & 0xff, Math.round(alpha * 255)], i);
		}
	}
	ctx.putImageData(image, 0, 0);
	canvas.refresh();
	return key;
}

export class Weather {
	private readonly sky: Sky;
	/** Each emitter, with how long its particles live at most. */
	private emitters: { emitter: Phaser.GameObjects.Particles.ParticleEmitter; life: number }[] = [];
	private splash: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
	/** The frame the emitters started on; they fill the sky once the camera has found the player. */
	private startedOn = -1;
	private frost: Phaser.Filters.Vignette | null = null;
	private readonly overcast: Phaser.GameObjects.Rectangle | null = null;
	private readonly fog: { sprite: Phaser.GameObjects.TileSprite; scale: number; speed: number }[] = [];
	private readonly flash: Phaser.GameObjects.Rectangle | null = null;
	/** When the next flash starts (scene time); 0 until the first update. */
	private flashAt = 0;

	constructor(
		private readonly scene: Phaser.Scene,
		season: Season,
		weather: WeatherNow,
		private readonly reducedMotion: boolean,
		/** Low effects quality: fewer particles, no frost filter, no splashes, thinner fog. */
		private readonly low = false,
	) {
		this.sky = skyFor(season, weather);
		const cam = scene.cameras.main;
		const screen = <T extends Phaser.GameObjects.Components.Origin & Phaser.GameObjects.Components.ScrollFactor>(o: T) => o.setOrigin(0).setScrollFactor(0);
		if (this.sky.overcast > 0) {
			const pale = weather.kind === "snow" || weather.kind === "fog";
			this.overcast = screen(scene.add.rectangle(0, 0, cam.width, cam.height, pale ? OVERCAST_PALE : OVERCAST_GREY, this.sky.overcast)).setDepth(OVERCAST_DEPTH);
		}
		if (this.sky.fog) {
			const key = bakeFog(scene);
			for (const layer of low ? FOG_LAYERS.slice(0, 1) : FOG_LAYERS) {
				const sprite = screen(scene.add.tileSprite(0, 0, cam.width, cam.height, key))
					.setTileScale(layer.scale)
					.setAlpha(low ? layer.alpha * 0.7 : layer.alpha)
					.setDepth(FOG_DEPTH);
				this.fog.push({ sprite, ...layer });
			}
		}
		if (this.sky.lightning && !reducedMotion) {
			this.flash = screen(scene.add.rectangle(0, 0, cam.width, cam.height, 0xdde6ff))
				.setBlendMode(Phaser.BlendModes.ADD)
				.setAlpha(0)
				.setVisible(false)
				.setDepth(FLASH_DEPTH);
		}
		this.start(cam.width, cam.height);
		// A cold, pale rim round the screen in winter.
		if (season === "winter" && !low) this.frost = cam.filters.internal.addVignette(0.5, 0.5, 0.9, FROST, 0xdde8f8);
	}

	/** Once a frame. The pale frost would glow in the dark: it fades as night falls. */
	update(dark: number): void {
		// Start mid-fall rather than with an empty sky, but only after the camera's first
		// follow step: before that its view is still at the map's corner.
		if (this.startedOn >= 0 && this.scene.game.loop.frame > this.startedOn + 1) {
			for (const { emitter, life } of this.emitters) emitter.fastForward(life);
			this.startedOn = -1;
		}
		if (this.frost) this.frost.strength = FROST * (1 - 0.8 * dark);
		const cam = this.scene.cameras.main;
		const now = this.scene.time.now;
		// The fog is anchored to the world, as the particles are, and drifts with the wind.
		const wind = this.sky.drift >= 0 ? 1 : -1;
		for (const { sprite, scale, speed } of this.fog) {
			const drift = this.reducedMotion ? 0 : (now / 1000) * speed;
			sprite.setTilePosition((cam.scrollX - wind * drift) / scale, (cam.scrollY - drift * 0.3) / scale);
		}
		if (this.flash) this.updateFlash(now, dark);
	}

	/** A new size means a new spread of particles. */
	resize(width: number, height: number): void {
		this.overcast?.setSize(width, height);
		this.flash?.setSize(width, height);
		for (const { sprite } of this.fog) sprite.setSize(width, height);
		this.stop();
		this.start(width, height);
	}

	destroy(): void {
		this.stop();
		this.overcast?.destroy();
		this.flash?.destroy();
		for (const { sprite } of this.fog) sprite.destroy();
		// On a map change the scene shuts down and its camera goes first, taking the frost
		// filter with it; only a camera that is still there needs it removed.
		const cam = this.scene.cameras?.main;
		if (this.frost && cam) cam.filters.internal.remove(this.frost);
	}

	/** Lightning now and then: it's brighter against a dark sky. */
	private updateFlash(now: number, dark: number): void {
		const flash = this.flash!;
		// The scene's clock reads 0 until its first tick, so the first flash is set from here:
		// soon, so a storm announces itself.
		if (this.flashAt === 0) this.flashAt = now + 2_000;
		const t = now - this.flashAt;
		if (t < 0) return;
		const end = FLASH_STEPS[FLASH_STEPS.length - 1][0];
		if (t > end) {
			flash.setVisible(false);
			const [least, more] = FLASH_EVERY;
			this.flashAt = now + (least + Math.random() * more) * 1000;
			return;
		}
		// Hold each step's level, except the last, which fades out.
		let level = 0;
		for (let i = 0; i < FLASH_STEPS.length - 1; i++) {
			const [from, value] = FLASH_STEPS[i];
			const [to, next] = FLASH_STEPS[i + 1];
			if (t < from || t >= to) continue;
			level = i === FLASH_STEPS.length - 2 ? value + (next - value) * ((t - from) / (to - from)) : value;
		}
		flash.setVisible(true).setAlpha(level * (0.08 + 0.14 * dark));
	}

	private stop(): void {
		for (const { emitter } of this.emitters) emitter.destroy();
		this.splash?.destroy();
		this.emitters = [];
		this.splash = null;
	}

	private start(width: number, height: number): void {
		const calm = this.reducedMotion || this.low;
		// Particles live in the world, not on the screen: each is born in or just above the
		// camera's current view, then falls where it is, so walking doesn't drag them along.
		const view = this.scene.cameras.main.worldView;
		const between = (min: number, max: number) => min + Math.random() * (max - min);
		const wet = this.sky.falls.some((f) => MOTION[f.kind].streak > 0);
		if (wet && !this.low) {
			bake(this.scene, SPLASH);
			this.splash = this.scene.add
				.particles(0, 0, SPLASH.key, { lifespan: 180, alpha: { start: 0.7, end: 0 }, emitting: false })
				.setDepth(DEPTH);
		}
		for (const { kind, density } of this.sky.falls) {
			const m = MOTION[kind];
			const drift = this.sky.drift * m.windy;
			const every = (calm ? m.every * 3 : m.every) / density;
			const life = { min: m.life[0], max: m.life[1] };
			if (kind === "rain" || kind === "heavyRain") {
				// Rain falls in a straight line along the wind; reduced motion slows it too.
				const slow = this.reducedMotion ? 0.7 : 1;
				const fall = ((m.fallY[0] + m.fallY[1]) / 2) * slow;
				const key = bakeStreak(this.scene, m.streak, drift / fall);
				const angle = (Math.atan2(fall, drift) * 180) / Math.PI;
				const splash = this.splash;
				this.emitters.push({
					life: m.life[1],
					emitter: this.scene.add
						.particles(0, 0, key, {
							x: { onEmit: () => between(view.x - 16, view.x + width + 16) },
							y: { onEmit: () => between(view.y - 16, view.y + height) },
							lifespan: life,
							angle,
							speed: { min: Math.hypot(m.fallY[0] * slow, drift), max: Math.hypot(m.fallY[1] * slow, drift) },
							alpha: m.alpha,
							frequency: every,
							quantity: 1,
							deathCallback: splash ? (p: Phaser.GameObjects.Particles.Particle) => splash.emitParticleAt(p.x, p.y) : undefined,
						})
						.setDepth(DEPTH),
				});
				continue;
			}
			bake(this.scene, SPRITES[kind]);
			// Blown sideways, flakes and leaves come from upwind: widen the band they're born in
			// on that side, and send more so the sky isn't thinner for it.
			const upwind = Math.abs(drift) * (m.life[1] / 1000);
			const left = drift > 0 ? upwind : 0;
			const right = drift < 0 ? upwind : 0;
			this.emitters.push({
				life: m.life[1],
				emitter: this.scene.add
					.particles(0, 0, SPRITES[kind].key, {
						x: { onEmit: () => between(view.x - 16 - left, view.x + width + 16 + right) },
						y: { onEmit: () => (m.wholeScreen ? between(view.y, view.y + height) : between(view.y - 8, view.y - 2)) },
						lifespan: life,
						speedY: { min: m.fallY[0], max: m.fallY[1] },
						speedX: { min: m.driftX[0] + drift, max: m.driftX[1] + drift },
						rotate: m.spin && !calm ? { start: 0, end: 360 } : 0,
						alpha: m.wholeScreen ? { start: m.alpha, end: 0 } : m.alpha,
						frequency: every * (width / (width + upwind)),
						quantity: 1,
					})
					.setDepth(DEPTH),
			});
		}
		this.startedOn = this.scene.game.loop.frame;
	}
}
