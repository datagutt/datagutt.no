// The emote wheel (docs/game/PLAN.md M4.5): the emotes a visitor can show others, in a
// ring around the player's head. Opened by holding interact or a long press on the player;
// arrows or the stick move round it, interact picks, back or a tap elsewhere cancels.
import Phaser from "phaser";
import { EMOTES, emoteFrame } from "./emotes";
import { GHOST_EMOTES, type GhostEmote } from "@datagutt/kai-net/protocol";
import type { FrameInput } from "../input/InputController";

const DEPTH = 110_000;
const RADIUS = 26;
const ACCENT = 0xffd27a;

export class EmoteWheel {
	private container: Phaser.GameObjects.Container | null = null;
	private selected = 0;
	private centre = { x: 0, y: 0 };
	private onPick: ((emote: GhostEmote | null) => void) | null = null;

	constructor(private readonly scene: Phaser.Scene) {}

	get open(): boolean {
		return this.container !== null;
	}

	/** Around a point on screen (the player's head); `onPick` gets the emote, or null if cancelled. */
	show(screenX: number, screenY: number, onPick: (emote: GhostEmote | null) => void): void {
		this.close();
		this.centre = { x: Math.round(screenX), y: Math.round(screenY) };
		this.onPick = onPick;
		this.selected = 0;
		this.render();
	}

	handle(input: FrameInput): void {
		if (!this.open) return;
		for (const dir of input.dirPresses) {
			const step = dir === "right" || dir === "down" ? 1 : -1;
			this.selected = (this.selected + step + GHOST_EMOTES.length) % GHOST_EMOTES.length;
			this.render();
		}
		const tap = input.taps.at(-1);
		if (tap) {
			const hit = GHOST_EMOTES.findIndex((_, i) => {
				const p = this.slot(i);
				return Math.abs(tap.screenX - p.x) <= 9 && Math.abs(tap.screenY - p.y) <= 9;
			});
			this.finish(hit >= 0 ? GHOST_EMOTES[hit] : null);
		} else if (input.interact) {
			this.finish(GHOST_EMOTES[this.selected]);
		} else if (input.back || input.menu) {
			this.finish(null);
		}
	}

	close(): void {
		this.container?.destroy();
		this.container = null;
	}

	private finish(emote: GhostEmote | null): void {
		const onPick = this.onPick;
		this.onPick = null;
		this.close();
		onPick?.(emote);
	}

	/** Screen position of the i-th emote: round the circle from the top, clockwise. */
	private slot(i: number) {
		const angle = -Math.PI / 2 + (i / GHOST_EMOTES.length) * Math.PI * 2;
		return { x: this.centre.x + Math.round(Math.cos(angle) * RADIUS), y: this.centre.y + Math.round(Math.sin(angle) * RADIUS) };
	}

	private render(): void {
		this.container?.destroy();
		const parts: Phaser.GameObjects.GameObject[] = [];
		const ring = this.scene.add.graphics();
		parts.push(ring);
		GHOST_EMOTES.forEach((emote, i) => {
			const p = this.slot(i);
			if (i === this.selected) ring.lineStyle(1, ACCENT, 1).strokeCircle(p.x, p.y, 10);
			parts.push(this.scene.add.sprite(p.x, p.y, "ui:emotes", emoteFrame(EMOTES[emote])).setOrigin(0.5));
		});
		this.container = this.scene.add.container(0, 0, parts).setScrollFactor(0).setDepth(DEPTH);
	}
}
