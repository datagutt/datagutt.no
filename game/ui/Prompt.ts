// Interaction prompt (docs/game/PLAN.md M5.10): when the player faces something usable, a
// small tag over it names the button and the action ("E Talk", "A Enter", "Tap Read"), in
// the input the player used last.
import Phaser from "phaser";
import type { InputDevice } from "../input/InputController";

export type PromptAction = "Talk" | "Read" | "Enter" | "Wake";

const INK = 0x3b2a3a;
const PAPER = 0xf2eef7;
const KEY = 0xffd27a;
const DEPTH = 60_002;

/** The button to show for each device. */
const BUTTON: Record<InputDevice, string> = { keyboard: "E", gamepad: "A", touch: "Tap" };

export class Prompt {
	private readonly box: Phaser.GameObjects.Graphics;
	private readonly key: Phaser.GameObjects.BitmapText;
	private readonly label: Phaser.GameObjects.BitmapText;
	private shown = "";
	private visible = false;

	/** The prompt on screen ("E Talk"), or null (for the ?debug readout). */
	get text(): string | null {
		return this.visible ? this.shown : null;
	}

	constructor(scene: Phaser.Scene) {
		this.box = scene.add.graphics().setDepth(DEPTH);
		this.key = scene.add.bitmapText(0, 0, "pixel", "").setTint(INK).setDepth(DEPTH + 1);
		this.label = scene.add.bitmapText(0, 0, "pixel", "").setTint(PAPER).setDepth(DEPTH + 1);
		this.hide();
	}

	/** Centred over (x, bottom) in world pixels. */
	show(action: PromptAction, device: InputDevice, x: number, bottom: number): void {
		const button = BUTTON[device];
		const text = `${button} ${action}`;
		if (text !== this.shown) {
			this.shown = text;
			this.key.setText(button);
			this.label.setText(action);
		}
		const kw = Math.ceil(this.key.getTextBounds().local.width) + 4;
		const lw = Math.ceil(this.label.getTextBounds().local.width);
		const h = Math.ceil(this.label.getTextBounds().local.height) + 4;
		const w = kw + lw + 6;
		const left = Math.round(x - w / 2);
		const top = Math.round(bottom - h);
		// A dark tag with the button as a light keycap at its left.
		this.box
			.clear()
			.fillStyle(INK, 0.85)
			.fillRect(left + 1, top, w - 2, h)
			.fillRect(left, top + 1, w, h - 2)
			.fillStyle(KEY, 1)
			.fillRect(left + 2, top + 2, kw - 1, h - 4);
		this.key.setPosition(left + 4, top + 2);
		this.label.setPosition(left + kw + 3, top + 2);
		this.setVisible(true);
	}

	hide(): void {
		this.setVisible(false);
	}

	private setVisible(visible: boolean): void {
		this.visible = visible;
		this.box.setVisible(visible);
		this.key.setVisible(visible);
		this.label.setVisible(visible);
	}

	destroy(): void {
		this.box.destroy();
		this.key.destroy();
		this.label.destroy();
	}
}
