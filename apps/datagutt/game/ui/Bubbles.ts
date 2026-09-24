// Bubbles over a character's head: an emote from LimeZu's sheet (game/ui/emotes.ts) or a
// short line of text (a custom Discord status). Both sit above the world's roofs and
// tree tops, anchored to the top of the head.
import Phaser from "phaser";
import { EMOTE_TAIL, EMOTES, emoteFrame, type EmoteName } from "@datagutt/kai/ui/emotes";
import { wrapText } from "./text";

const DEPTH = 60_000;
/** Each bubble flips between its two frames this often. */
const FRAME_MS = 550;
const INK = 0x3b2a3a;
const PAPER = 0xf2eef7;
const TEXT_WIDTH = 84;
const PAD = 3;

export class EmoteBubble {
	private readonly tail: Phaser.GameObjects.Sprite;
	private readonly bubble: Phaser.GameObjects.Sprite;
	private emote: EmoteName | null = null;

	constructor(scene: Phaser.Scene) {
		this.tail = scene.add.sprite(0, 0, "ui:emotes", emoteFrame(EMOTE_TAIL)).setOrigin(0.5, 1).setDepth(DEPTH).setVisible(false);
		this.bubble = scene.add.sprite(0, 0, "ui:emotes", 0).setOrigin(0.5, 1).setDepth(DEPTH).setVisible(false);
	}

	show(emote: EmoteName | null): void {
		this.emote = emote;
		this.tail.setVisible(Boolean(emote));
		this.bubble.setVisible(Boolean(emote));
	}

	/** Place it over a head whose top is at (x, headTop), in world pixels. */
	update(timeMs: number, x: number, headTop: number): void {
		if (!this.emote) return;
		const frame = emoteFrame(EMOTES[this.emote]) + (Math.floor(timeMs / FRAME_MS) % 2);
		// The tail's dots sit low in their frame; the bubble's circle fills most of its own.
		this.tail.setPosition(x, headTop + 6);
		this.bubble.setFrame(frame).setPosition(x, headTop - 6);
	}

	destroy(): void {
		this.tail.destroy();
		this.bubble.destroy();
	}
}

export class SpeechBubble {
	private readonly box: Phaser.GameObjects.Graphics;
	private readonly label: Phaser.GameObjects.BitmapText;
	private readonly measurer: Phaser.GameObjects.BitmapText;
	private text: string | null = null;
	private size = { w: 0, h: 0 };

	constructor(scene: Phaser.Scene) {
		this.box = scene.add.graphics().setDepth(DEPTH).setVisible(false);
		this.label = scene.add.bitmapText(0, 0, "pixel", "").setTint(INK).setDepth(DEPTH + 1).setVisible(false);
		this.measurer = scene.add.bitmapText(-1000, -1000, "pixel", "").setVisible(false);
	}

	show(text: string | null): void {
		if (text === this.text) return;
		this.text = text;
		this.box.setVisible(Boolean(text));
		this.label.setVisible(Boolean(text));
		if (!text) return;
		const measure = (t: string) => this.measurer.setText(t).getTextBounds().local.width;
		const lines = wrapText(text, TEXT_WIDTH, measure).slice(0, 3);
		this.label.setText(lines.join("\n"));
		const bounds = this.label.getTextBounds().local;
		this.size = { w: Math.ceil(bounds.width) + PAD * 2, h: Math.ceil(bounds.height) + PAD * 2 };
	}

	/** Place it over a head whose top is at (x, headTop), in world pixels. */
	update(x: number, headTop: number): void {
		if (!this.text) return;
		const { w, h } = this.size;
		const left = Math.round(x - w / 2);
		const top = Math.round(headTop - 6 - h);
		// A rounded box (corners cut by a pixel) with a small tail pointing at the head.
		this.box
			.clear()
			.fillStyle(INK, 1)
			.fillRect(left + 1, top, w - 2, h)
			.fillRect(left, top + 1, w, h - 2)
			.fillRect(Math.round(x) - 2, top + h, 4, 2)
			.fillRect(Math.round(x) - 1, top + h + 2, 2, 2)
			.fillStyle(PAPER, 1)
			.fillRect(left + 1, top + 1, w - 2, h - 2)
			.fillRect(Math.round(x) - 1, top + h - 1, 2, 2);
		this.label.setPosition(left + PAD, top + PAD);
	}

	destroy(): void {
		this.box.destroy();
		this.label.destroy();
		this.measurer.destroy();
	}
}
