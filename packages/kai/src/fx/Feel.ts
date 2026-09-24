// Game feel (docs/game/PLAN.md M5.5): the small reactions that make moving around read as
// physical. Dust at each footstep, a nudge and a thud when walking into something, a
// squash on stepping through a door, a shake when a stamp lands, and a camera that eases
// after the player and looks a little ahead. Reduced motion drops the shake and the
// look-ahead and thins the dust.
import Phaser from "phaser";
import { STEP, type Point } from "../world/grid.ts";
import type { Facing } from "../world/objects.ts";
import type { Actor } from "../entities/Actor.ts";

const DUST_KEY = "fx:dust";
/** How far ahead of the player the camera looks, in pixels, and how fast it gets there. */
const LOOK_AHEAD = { x: 14, y: 8, ease: 0.06 };
const CAMERA_LERP = 0.14;

export class Feel {
	private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
	private look = { x: 0, y: 0 };

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly player: Actor,
		private readonly reducedMotion: () => boolean,
	) {
		if (!scene.textures.exists(DUST_KEY)) {
			const canvas = scene.textures.createCanvas(DUST_KEY, 2, 2)!;
			const ctx = canvas.getContext();
			ctx.fillStyle = "#e9dcc4";
			ctx.fillRect(0, 0, 2, 2);
			canvas.refresh();
		}
		this.dust = scene.add
			.particles(0, 0, DUST_KEY, {
				lifespan: { min: 300, max: 520 },
				speedX: { min: -14, max: 14 },
				speedY: { min: -10, max: -2 },
				alpha: { start: 0.7, end: 0 },
				scale: { start: 1, end: 0.5 },
				emitting: false,
			})
			.setDepth(-0.4);
		scene.cameras.main.startFollow(player.sprite, true, CAMERA_LERP, CAMERA_LERP);
	}

	/** A step began from `from`: a puff of dust at the heels. */
	step(from: Point): void {
		this.dust.explode(this.reducedMotion() ? 1 : 3, from.x * 16 + 8, from.y * 16 + 14);
	}

	/** Walked into something: lean into it for a moment. */
	bump(facing: Facing): void {
		const d = STEP[facing];
		this.scene.tweens.add({ targets: this.player.offset, x: d.x * 2, y: d.y * 2, duration: 45, yoyo: true, ease: "Quad.easeOut" });
	}

	/** Stepping through a door: squash down, then the fade takes over. */
	squash(): void {
		this.scene.tweens.add({ targets: this.player.sprite, scaleY: 0.82, scaleX: 1.14, duration: 90, yoyo: true, ease: "Quad.easeOut" });
	}

	/** A new passport stamp. */
	shake(): void {
		if (!this.reducedMotion()) this.scene.cameras.main.shake(180, 0.006);
	}

	/** Ease the camera's look-ahead toward where the player faces. */
	update(): void {
		const cam = this.scene.cameras.main;
		const d = STEP[this.player.mover.facing];
		const moving = this.player.mover.moving && !this.reducedMotion();
		const target = moving ? { x: d.x * LOOK_AHEAD.x, y: d.y * LOOK_AHEAD.y } : { x: 0, y: 0 };
		this.look.x += (target.x - this.look.x) * LOOK_AHEAD.ease;
		this.look.y += (target.y - this.look.y) * LOOK_AHEAD.ease;
		// Follow offset moves the camera the other way, so negate to look ahead.
		cam.setFollowOffset(-Math.round(this.look.x), -Math.round(this.look.y));
	}

	destroy(): void {
		this.dust.destroy();
	}
}
