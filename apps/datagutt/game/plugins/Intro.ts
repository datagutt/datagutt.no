// The ferry intro (docs/PLAN.md M5.7), on a first visit only: the ferry sails in to
// the pier with the player aboard, the player hops ashore, and Arne says hello (with the
// passport, the controls and the Journal). Any key, button or tap skips the sailing.
// The ferry is part of the map; for the voyage its tiles are lifted into a moving group
// of images, and put back once it has docked. Its sprites (the bobbing hull) sail along.
import Phaser from "phaser";
import { TILE } from "@datagutt/kai";
import type { Actor } from "@datagutt/kai/entities/Actor";
import type { FrameInput } from "@datagutt/kai/input/InputController";
import type { Point } from "@datagutt/kai/world/grid";

/** How far out the ferry starts, in tiles, and how long the crossing takes. */
const START_TILES = 14;
const SAIL_MS = 5500;
const HOP_MS = 380;

type Area = { x: number; y: number; w: number; h: number };
type Lifted = { layer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer; x: number; y: number; index: number; flipX: boolean; flipY: boolean; rotation: number };

export class Intro {
	private readonly boat: Phaser.GameObjects.Container;
	private readonly lifted: Lifted[] = [];
	/** The ferry's sprites and where they are moored. */
	private readonly sailing: { sprite: Phaser.GameObjects.Sprite; x: number }[];
	private tween: Phaser.Tweens.Tween | null = null;
	private stage: "sailing" | "ashore" | "done" = "sailing";

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly player: Actor,
		ferry: Area,
		layers: (Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer)[],
		sprites: Phaser.GameObjects.Sprite[],
		private readonly spawn: Point,
		reducedMotion: boolean,
		/** Arne's welcome, then `done`. */
		private readonly welcome: (done: () => void) => void,
		private readonly finished: () => void,
	) {
		this.boat = scene.add.container(START_TILES * TILE, 0);
		this.sailing = sprites.map((sprite) => ({ sprite, x: sprite.x }));
		this.moveSprites();
		const atlas = scene.textures.get("tiles:world");
		const columns = Math.floor((atlas.getSourceImage() as { width: number }).width / TILE);
		for (const layer of layers) {
			for (let y = ferry.y; y < ferry.y + ferry.h; y++) {
				for (let x = ferry.x; x < ferry.x + ferry.w; x++) {
					const tile = layer.getTileAt(x, y);
					if (!tile || tile.index < 0) continue;
					this.lifted.push({ layer, x, y, index: tile.index, flipX: tile.flipX, flipY: tile.flipY, rotation: tile.rotation });
					// The tileset's first gid is 1: index n is atlas slot n - 1, given a frame of its own.
					const slot = tile.index - 1;
					const frame = `tile:${slot}`;
					if (!atlas.has(frame)) atlas.add(frame, 0, (slot % columns) * TILE, Math.floor(slot / columns) * TILE, TILE, TILE);
					const image = scene.add
						.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tiles:world", frame)
						.setFlip(tile.flipX, tile.flipY)
						.setRotation(tile.rotation);
					this.boat.add(image);
					layer.removeTileAt(x, y);
				}
			}
		}
		// Aboard: on the deck, facing the pier.
		player.mover.place({ x: ferry.x + 2, y: ferry.y + ferry.h - 2 }, "left");
		this.tween = scene.tweens.add({
			targets: this.boat,
			x: 0,
			duration: reducedMotion ? SAIL_MS / 2 : SAIL_MS,
			ease: reducedMotion ? "Linear" : "Sine.easeOut",
			onComplete: () => this.goAshore(),
		});
	}

	get active(): boolean {
		return this.stage !== "done";
	}

	/** While sailing, any key, button or tap jumps to the arrival. */
	update(input: FrameInput): void {
		if (this.stage === "sailing" && (input.interact || input.back || input.menu || input.taps.length)) {
			this.tween?.stop();
			this.boat.x = 0;
			this.goAshore();
		}
		// The player rides the ferry: its deck, not the tile they stand on, moves.
		if (this.stage === "sailing") {
			this.player.offset.x = Math.round(this.boat.x);
			this.moveSprites();
		}
		this.boat.setDepth(this.player.sprite.depth - 1);
		this.player.sync();
	}

	private goAshore(): void {
		if (this.stage !== "sailing") return;
		this.stage = "ashore";
		this.dock();
		const from = this.player.mover.tile;
		const lift = { t: 0 };
		const dx = (this.spawn.x - from.x) * TILE;
		const dy = (this.spawn.y - from.y) * TILE;
		// A little hop from the deck onto the pier.
		this.tween = this.scene.tweens.add({
			targets: lift,
			t: 1,
			duration: HOP_MS,
			onUpdate: () => {
				this.player.offset.x = Math.round(dx * lift.t);
				this.player.offset.y = Math.round(dy * lift.t - Math.sin(lift.t * Math.PI) * 10);
			},
			onComplete: () => {
				this.player.offset.x = this.player.offset.y = 0;
				this.player.mover.place(this.spawn, "down");
				this.welcome(() => {
					this.stage = "done";
					this.finished();
				});
			},
		});
	}

	private moveSprites(): void {
		for (const { sprite, x } of this.sailing) sprite.x = x + Math.round(this.boat.x);
	}

	/** Back into the map: the ferry is moored where the generator put it. */
	private dock(): void {
		for (const { sprite, x } of this.sailing) sprite.x = x;
		for (const t of this.lifted) {
			const tile = t.layer.putTileAt(t.index, t.x, t.y);
			tile.flipX = t.flipX;
			tile.flipY = t.flipY;
			tile.rotation = t.rotation;
		}
		this.boat.destroy();
	}
}
