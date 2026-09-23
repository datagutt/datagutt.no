// A character on the map: a 16×32 sprite driven by a GridMover. The sprite's feet sit
// on the bottom of its tile and it depth-sorts by its feet so it walks behind things.
// Its origin is the middle of its feet, so squash and stretch keep it standing.
import Phaser from "phaser";
import { TILE } from "../constants";
import { ANIMS, animKey, type AnimName } from "../characters/sheet";
import { GridMover, type MoverConfig } from "../world/movement";
import type { Point } from "../world/grid";
import type { Facing } from "../world/objects";

export class Actor {
	readonly sprite: Phaser.GameObjects.Sprite;
	readonly mover: GridMover;
	private currentAnim = "";
	/** Lying in bed: only the sleeping head is drawn, at `offset` from the tile. */
	asleep = false;
	/** Nudge in pixels, for poses that don't line up with the tile grid (a head on a pillow). */
	offset = { x: 0, y: 0 };

	constructor(
		scene: Phaser.Scene,
		readonly id: string,
		readonly character: string,
		tile: Point,
		facing: Facing,
		config: MoverConfig,
	) {
		this.mover = new GridMover(tile, facing, config);
		this.sprite = scene.add.sprite(0, 0, `char:${character}`).setOrigin(0.5, 1);
		this.sync();
	}

	/** Move the sprite to the mover's position and pick the right animation. */
	sync(): void {
		const { x, y } = this.mover.position;
		this.sprite.setPosition(Math.round(x * TILE) + TILE / 2 + this.offset.x, Math.round((y + 1) * TILE) + this.offset.y);
		this.sprite.setDepth(this.sprite.y);
		this.play(this.asleep ? "sleep" : this.mover.moving ? "walk" : "idle");
	}

	/** The middle of the sprite across, in world pixels. */
	get centerX(): number {
		return this.sprite.x;
	}

	/** Top of the head in world pixels, for bubbles. Frames leave some air above it. */
	get headTop(): number {
		return this.sprite.y - this.sprite.height + (this.asleep ? 1 : 7);
	}

	private play(anim: AnimName): void {
		const key = animKey(this.character, anim, anim === "sleep" ? "right" : this.mover.facing);
		if (key === this.currentAnim) return;
		// Turning a corner mid-walk: keep the stride instead of restarting the cycle.
		// currentFrame.index is 1-based; startFrame is 0-based.
		const wasWalking = this.currentAnim.includes(":walk:");
		const stride = wasWalking && anim === "walk" ? (this.sprite.anims.currentFrame?.index ?? 1) - 1 : 0;
		this.currentAnim = key;
		this.sprite.play({ key, startFrame: stride % ANIMS.walk.framesPerDirection }, true);
	}

	destroy(): void {
		this.sprite.destroy();
	}
}
