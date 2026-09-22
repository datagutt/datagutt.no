// Minimal in-engine text box for signs and NPCs (docs/game/PLAN.md M1.6). The full
// dialogue UI with portraits, choices and Ink comes in M2.4; this keeps the same shape:
// typewriter reveal, interact to finish the page, interact again for the next one.
import Phaser from "phaser";
import { paginate, wrapText } from "./text";

const FONT = "pixel";
const PADDING = 6;
const LINES = 3;
const CHARS_PER_SECOND = 50;

export class DialogueBox {
	private readonly container: Phaser.GameObjects.Container;
	private readonly frame: Phaser.GameObjects.Graphics;
	private readonly label: Phaser.GameObjects.BitmapText;
	private readonly nameTag: Phaser.GameObjects.BitmapText;
	private readonly more: Phaser.GameObjects.BitmapText;
	private pages: string[][] = [];
	private page = 0;
	private revealed = 0;
	private onClose: (() => void) | null = null;

	constructor(private readonly scene: Phaser.Scene) {
		this.frame = scene.add.graphics();
		this.label = scene.add.bitmapText(0, 0, FONT, "").setTint(0xe8f5e9);
		this.nameTag = scene.add.bitmapText(0, 0, FONT, "").setTint(0x46e294);
		this.more = scene.add.bitmapText(0, 0, FONT, "▼").setTint(0x46e294);
		// "▼" is not in the font: fall back to a caret drawn from "v".
		if (!this.more.text || this.more.width === 0) this.more.setText("v");
		this.container = scene.add
			.container(0, 0, [this.frame, this.nameTag, this.label, this.more])
			.setScrollFactor(0)
			.setDepth(100_000)
			.setVisible(false);
	}

	get open(): boolean {
		return this.container.visible;
	}

	private get lineHeight(): number {
		return this.scene.cache.bitmapFont.get(FONT).data.lineHeight;
	}

	private measure = (text: string): number => this.label.setText(text).getTextBounds().local.width;

	show(text: string, speaker: string | null, onClose?: () => void): void {
		const { width } = this.layout();
		this.pages = paginate(wrapText(text, width - PADDING * 2, this.measure), LINES);
		this.page = 0;
		this.revealed = 0;
		this.onClose = onClose ?? null;
		this.nameTag.setText(speaker ?? "");
		this.label.setText("");
		this.container.setVisible(true);
		this.draw();
	}

	/** Interact pressed: finish the page, go to the next one, or close. */
	advance(): void {
		if (!this.open) return;
		const full = this.pages[this.page].join("\n");
		if (this.revealed < full.length) {
			this.revealed = full.length;
		} else if (this.page < this.pages.length - 1) {
			this.page++;
			this.revealed = 0;
		} else {
			this.container.setVisible(false);
			const done = this.onClose;
			this.onClose = null;
			done?.();
			return;
		}
		this.draw();
	}

	update(dtMs: number, timeMs: number): void {
		if (!this.open) return;
		const full = this.pages[this.page].join("\n");
		if (this.revealed < full.length) {
			this.revealed = Math.min(full.length, this.revealed + (dtMs / 1000) * CHARS_PER_SECOND);
			this.label.setText(full.slice(0, Math.floor(this.revealed)));
		}
		this.more.setVisible(this.revealed >= full.length && Math.floor(timeMs / 400) % 2 === 0);
	}

	/** Re-layout after the viewport changes size. */
	relayout(): void {
		if (this.open) this.draw();
	}

	private layout() {
		const cam = this.scene.cameras.main;
		const width = Math.min(cam.width - 8, 300);
		const height = LINES * this.lineHeight + PADDING * 2;
		const x = Math.floor((cam.width - width) / 2);
		const y = cam.height - height - 4;
		return { x, y, width, height };
	}

	private draw(): void {
		const { x, y, width, height } = this.layout();
		const g = this.frame.clear();
		g.fillStyle(0x0b1320, 0.94).fillRect(x, y, width, height);
		g.lineStyle(1, 0xe8f5e9, 1).strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
		g.lineStyle(1, 0x1dc672, 1).strokeRect(x + 2.5, y + 2.5, width - 5, height - 5);
		const full = this.pages[this.page].join("\n");
		this.label.setText(full.slice(0, Math.floor(this.revealed))).setPosition(x + PADDING, y + PADDING);
		if (this.nameTag.text) {
			const w = this.nameTag.getTextBounds().local.width + 8;
			g.fillStyle(0x0b1320, 1).fillRect(x + 4, y - this.lineHeight + 2, w, this.lineHeight);
			g.lineStyle(1, 0x1dc672, 1).strokeRect(x + 4.5, y - this.lineHeight + 2.5, w - 1, this.lineHeight - 1);
			this.nameTag.setPosition(x + 8, y - this.lineHeight + 3);
		}
		this.more.setPosition(x + width - PADDING - 5, y + height - PADDING - 6);
	}
}
