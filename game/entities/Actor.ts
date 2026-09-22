// A character on the map: a 16×32 sprite driven by a GridMover. The sprite's feet sit
// on the bottom of its tile and it depth-sorts by its feet so it walks behind things.
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

	constructor(
		scene: Phaser.Scene,
		readonly id: string,
		readonly character: string,
		tile: Point,
		facing: Facing,
		config: MoverConfig,
	) {
		this.mover = new GridMover(tile, facing, config);
		this.sprite = scene.add.sprite(0, 0, `char:${character}`).setOrigin(0, 1);
		this.sync();
	}

	/** Move the sprite to the mover's position and pick the right animation. */
	sync(): void {
		const { x, y } = this.mover.position;
		this.sprite.setPosition(Math.round(x * TILE), Math.round((y + 1) * TILE));
		this.sprite.setDepth(this.sprite.y);
		this.play(this.mover.moving ? "walk" : "idle");
	}

	private play(anim: AnimName): void {
		const key = animKey(this.character, anim, this.mover.facing);
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
