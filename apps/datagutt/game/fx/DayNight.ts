// Time of day on screen (docs/game/PLAN.md M5.1; the clock is game/world/dayNight.ts).
// Outdoors, a colour multiplied over the world tints it. It sits below the lights, which
// add on top and so really glow after dark. Indoors nothing is tinted; daylight through
// the windows fades at night. Timed lights follow the clock everywhere.
import Phaser from "phaser";
import type { LightObject } from "@datagutt/kai/world/objects";
import { daylightAt, lightFactor, type Daylight } from "../world/dayNight";
import { LIGHT_DEPTH } from "./Lights";

/** Refresh this often; the light changes over minutes, not frames. */
const REFRESH_MS = 1_000;

export class DayNight {
	private readonly overlay: Phaser.GameObjects.Rectangle | null;
	private nextAt = 0;
	/** The light as last applied. */
	current: Daylight = daylightAt(12);

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly lights: { light: LightObject; image: Phaser.GameObjects.Image }[],
		outdoors: boolean,
		private readonly hours: () => number,
		private readonly month: () => number,
	) {
		const cam = scene.cameras.main;
		this.overlay = outdoors
			? scene.add
					.rectangle(0, 0, cam.width, cam.height, 0xffffff)
					.setOrigin(0)
					.setScrollFactor(0)
					.setBlendMode(Phaser.BlendModes.MULTIPLY)
					.setDepth(LIGHT_DEPTH - 1)
			: null;
		this.update(0, true);
	}

	resize(width: number, height: number): void {
		this.overlay?.setSize(width, height);
	}

	update(timeMs: number, force = false): void {
		if (!force && timeMs < this.nextAt) return;
		this.nextAt = timeMs + REFRESH_MS;
		const light = (this.current = daylightAt(this.hours(), this.month()));
		if (this.overlay) this.overlay.setFillStyle(light.tint).setVisible(light.tint !== 0xffffff);
		for (const { light: l, image } of this.lights) {
			if (!l.when) continue;
			const alpha = l.intensity * lightFactor(l.when, light.dark);
			image.setAlpha(alpha).setVisible(alpha > 0.01);
		}
	}
}
