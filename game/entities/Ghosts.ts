// Other visitors on this map, drawn as translucent tinted copies of the player sprite
// (docs/game/PLAN.md M4.4). They walk from tile to tile as the room reports their moves,
// pass through everything, and never block anyone. Only the nearest are drawn, and one
// who stands still long enough fades away until they move again.
import Phaser from "phaser";
import { Actor } from "./Actor";
import { PLAYER_MOVEMENT } from "../world/movement";
import { directionBetween, type Point } from "../world/grid";
import type { Ghost, GhostEmote, ServerMessage } from "../net/protocol";
import { EmoteBubble } from "../ui/Bubbles";

/** Drawn at most, nearest to the player first. */
export const MAX_GHOSTS = 20;
const ALPHA = 0.6;
/** Standing still this long, a ghost fades out (until it moves again). */
const IDLE_MS = 30_000;
const FADE_MS = 1_000;
/** Further behind than this, a ghost jumps to where it should be instead of walking. */
const SNAP_TILES = 3;
const EMOTE_MS = 3_000;
const LONG_PRESS_MS = 400;
const LABEL_MS = 2_500;

type Shown = { ghost: Ghost; actor: Actor; bubble: EmoteBubble; activeAt: number; emoteUntil: number; local: boolean };

export class GhostLayer {
	private readonly ghosts = new Map<string, Shown>();
	private readonly label: Phaser.GameObjects.BitmapText;
	private labelFor: string | null = null;
	private labelUntil = 0;
	private pressAt: { time: number; x: number; y: number } | null = null;
	private now = 0;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly map: string,
	) {
		this.label = scene.add.bitmapText(0, 0, "pixel", "").setOrigin(0.5, 1).setDepth(60_001).setVisible(false);
		const input = scene.input;
		input.on(Phaser.Input.Events.POINTER_MOVE, this.onHover, this);
		input.on(Phaser.Input.Events.POINTER_DOWN, this.onPress, this);
		input.on(Phaser.Input.Events.POINTER_UP, this.onRelease, this);
	}

	/** Ghosts in the room right now (for the ?debug readout). */
	get count(): number {
		return this.ghosts.size;
	}

	/** A message from the room, or with `local` one made up here (?debug&ghosts=), which a room snapshot keeps. */
	handle(message: ServerMessage, local = false): void {
		switch (message.t) {
			case "room":
				if (message.map !== this.map) return;
				for (const [id, shown] of [...this.ghosts]) if (!shown.local) this.remove(id);
				for (const ghost of message.ghosts) this.add(ghost, false);
				break;
			case "joined":
				this.add(message.ghost, local);
				break;
			case "moved": {
				const shown = this.ghosts.get(message.id);
				if (!shown) return;
				Object.assign(shown.ghost, { x: message.x, y: message.y, facing: message.facing });
				shown.activeAt = this.now;
				break;
			}
			case "emoted":
				this.emote(message.id, message.emote);
				break;
			case "left":
				this.remove(message.id);
				break;
		}
	}

	private add(ghost: Ghost, local: boolean): void {
		this.remove(ghost.id);
		const actor = new Actor(this.scene, `ghost:${ghost.id}`, "player", tileOf(ghost), ghost.facing, PLAYER_MOVEMENT);
		actor.sprite.setTint(parseInt(ghost.tint, 16)).setAlpha(ALPHA);
		this.ghosts.set(ghost.id, { ghost: { ...ghost }, actor, bubble: new EmoteBubble(this.scene), activeAt: this.now, emoteUntil: 0, local });
	}

	private remove(id: string): void {
		const shown = this.ghosts.get(id);
		if (!shown) return;
		shown.actor.destroy();
		shown.bubble.destroy();
		this.ghosts.delete(id);
		if (this.labelFor === id) this.labelFor = null;
	}

	private emote(id: string, emote: GhostEmote): void {
		const shown = this.ghosts.get(id);
		if (!shown) return;
		shown.bubble.show(emote);
		shown.emoteUntil = this.now + EMOTE_MS;
		shown.activeAt = this.now;
	}

	update(dtMs: number, timeMs: number, player: Point): void {
		this.now = timeMs;
		const byDistance = [...this.ghosts.values()].sort((a, b) => distance(a.ghost, player) - distance(b.ghost, player));
		byDistance.forEach((shown, i) => {
			const { actor, ghost } = shown;
			const visible = i < MAX_GHOSTS;
			actor.sprite.setVisible(visible);
			if (!visible) {
				actor.mover.place(tileOf(ghost), ghost.facing);
				shown.bubble.show(null);
				return;
			}
			this.step(shown, dtMs);
			actor.sync();
			const idle = timeMs - shown.activeAt - IDLE_MS;
			actor.sprite.setAlpha(ALPHA * Phaser.Math.Clamp(1 - idle / FADE_MS, 0, 1));
			if (shown.emoteUntil && timeMs > shown.emoteUntil) {
				shown.emoteUntil = 0;
				shown.bubble.show(null);
			}
			shown.bubble.update(timeMs, actor.sprite.x + actor.sprite.width / 2, actor.headTop);
		});
		this.updateLabel(timeMs);
	}

	/** Walk one tile at a time toward where the room last said the ghost is. */
	private step({ actor, ghost }: Shown, dtMs: number): void {
		const mover = actor.mover;
		mover.update(dtMs, { dir: null, run: false }, () => true);
		if (mover.moving) return;
		const here = mover.tile;
		if (here.x === ghost.x && here.y === ghost.y) {
			mover.face(ghost.facing);
			return;
		}
		if (distance(here, ghost) > SNAP_TILES) {
			mover.place(tileOf(ghost), ghost.facing);
			return;
		}
		const next = here.x !== ghost.x ? { x: here.x + Math.sign(ghost.x - here.x), y: here.y } : { x: here.x, y: here.y + Math.sign(ghost.y - here.y) };
		const dir = directionBetween(here, next);
		if (dir) mover.walk(dir, distance(here, ghost) > 1, () => true);
	}

	private ghostAt(screenX: number, screenY: number): Shown | undefined {
		const world = this.scene.cameras.main.getWorldPoint(screenX, screenY);
		return [...this.ghosts.values()].find((s) => s.actor.sprite.visible && s.actor.sprite.getBounds().contains(world.x, world.y));
	}

	private onHover(pointer: Phaser.Input.Pointer): void {
		if (pointer.wasTouch) return;
		const shown = this.ghostAt(pointer.x, pointer.y);
		this.labelFor = shown?.ghost.id ?? null;
		this.labelUntil = Infinity;
	}

	private onPress(pointer: Phaser.Input.Pointer): void {
		this.pressAt = { time: this.now, x: pointer.x, y: pointer.y };
	}

	/** A long press on a ghost shows its name for a moment (touch has no hover). */
	private onRelease(): void {
		const press = this.pressAt;
		this.pressAt = null;
		if (!press || this.now - press.time < LONG_PRESS_MS) return;
		const shown = this.ghostAt(press.x, press.y);
		if (!shown) return;
		this.labelFor = shown.ghost.id;
		this.labelUntil = this.now + LABEL_MS;
	}

	private updateLabel(timeMs: number): void {
		const shown = this.labelFor ? this.ghosts.get(this.labelFor) : undefined;
		if (!shown || timeMs > this.labelUntil || !shown.actor.sprite.visible) {
			this.label.setVisible(false);
			return;
		}
		const { sprite } = shown.actor;
		this.label
			.setText(shown.ghost.name)
			.setTint(parseInt(shown.ghost.tint, 16))
			.setPosition(Math.round(sprite.x + sprite.width / 2), Math.round(shown.actor.headTop - 2))
			.setVisible(true);
	}

	destroy(): void {
		const input = this.scene.input;
		input.off(Phaser.Input.Events.POINTER_MOVE, this.onHover, this);
		input.off(Phaser.Input.Events.POINTER_DOWN, this.onPress, this);
		input.off(Phaser.Input.Events.POINTER_UP, this.onRelease, this);
		for (const id of [...this.ghosts.keys()]) this.remove(id);
		this.label.destroy();
	}
}

const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const tileOf = (p: Point): Point => ({ x: p.x, y: p.y });
