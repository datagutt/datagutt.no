// In-engine dialogue box (docs/game/PLAN.md M1.6, growing into M2.4): a typewriter
// reveal of paged text, and a choice list for Ink choices. Input is fed in by the scene.
import Phaser from "phaser";
import type { Facing } from "../world/objects";
import { paginate, wrapText } from "./text";

const FONT = "pixel";
const PADDING = 6;
const LINES = 3;
const CHARS_PER_SECOND = 50;
const CHOICE_INDENT = 10;

type Mode =
	| { kind: "closed" }
	| { kind: "text"; pages: string[][]; page: number; revealed: number; onDone: () => void }
	| { kind: "choices"; choices: string[]; selected: number; onPick: (index: number) => void };

export class DialogueBox {
	private readonly container: Phaser.GameObjects.Container;
	private readonly frame: Phaser.GameObjects.Graphics;
	private readonly label: Phaser.GameObjects.BitmapText;
	private readonly nameTag: Phaser.GameObjects.BitmapText;
	private readonly measurer: Phaser.GameObjects.BitmapText;
	private mode: Mode = { kind: "closed" };
	private speaker: string | null = null;
	private blinkOn = true;

	constructor(private readonly scene: Phaser.Scene) {
		this.frame = scene.add.graphics();
		this.label = scene.add.bitmapText(0, 0, FONT, "").setTint(0xe8f5e9);
		this.nameTag = scene.add.bitmapText(0, 0, FONT, "").setTint(0x46e294);
		this.measurer = scene.add.bitmapText(-1000, -1000, FONT, "").setVisible(false);
		this.container = scene.add
			.container(0, 0, [this.frame, this.nameTag, this.label])
			.setScrollFactor(0)
			.setDepth(100_000)
			.setVisible(false);
	}

	get open(): boolean {
		return this.mode.kind !== "closed";
	}

	private get lineHeight(): number {
		return this.scene.cache.bitmapFont.get(FONT).data.lineHeight;
	}

	private measure = (text: string): number => this.measurer.setText(text).getTextBounds().local.width;

	/** Show a line of text; `onDone` runs when the player dismisses its last page. */
	say(text: string, speaker: string | null, onDone: () => void): void {
		const { width } = this.layout(LINES);
		this.speaker = speaker;
		this.mode = {
			kind: "text",
			pages: paginate(wrapText(text, width - PADDING * 2, this.measure), LINES),
			page: 0,
			revealed: 0,
			onDone,
		};
		this.container.setVisible(true);
		this.draw();
	}

	/** Show choices; `onPick` receives the chosen index. */
	choose(choices: string[], onPick: (index: number) => void): void {
		this.mode = { kind: "choices", choices, selected: 0, onPick };
		this.container.setVisible(true);
		this.draw();
	}

	close(): void {
		this.mode = { kind: "closed" };
		this.container.setVisible(false);
	}

	/** Interact pressed. */
	advance(): void {
		const m = this.mode;
		if (m.kind === "text") {
			const full = m.pages[m.page].join("\n");
			if (m.revealed < full.length) {
				m.revealed = full.length;
			} else if (m.page < m.pages.length - 1) {
				m.page++;
				m.revealed = 0;
			} else {
				m.onDone();
				return;
			}
			this.draw();
		} else if (m.kind === "choices") {
			m.onPick(m.selected);
		}
	}

	/** Up/down moves the choice cursor. */
	move(dir: Facing): void {
		const m = this.mode;
		if (m.kind !== "choices") return;
		if (dir === "up") m.selected = (m.selected + m.choices.length - 1) % m.choices.length;
		if (dir === "down") m.selected = (m.selected + 1) % m.choices.length;
		this.draw();
	}

	/** A tap at screen coordinates: picks the choice under it, or acts like interact. */
	tap(screenX: number, screenY: number): void {
		const m = this.mode;
		if (m.kind === "choices") {
			const { x, y, width } = this.layout(m.choices.length);
			const row = Math.floor((screenY - y - PADDING) / this.lineHeight);
			if (screenX >= x && screenX <= x + width && row >= 0 && row < m.choices.length) {
				m.selected = row;
				m.onPick(row);
			}
			return;
		}
		this.advance();
	}

	update(dtMs: number, timeMs: number): void {
		const m = this.mode;
		const blink = Math.floor(timeMs / 400) % 2 === 0;
		if (m.kind === "text") {
			const full = m.pages[m.page].join("\n");
			if (m.revealed < full.length) {
				m.revealed = Math.min(full.length, m.revealed + (dtMs / 1000) * CHARS_PER_SECOND);
				this.draw();
			} else if (blink !== this.blinkOn) {
				this.blinkOn = blink;
				this.draw();
			}
		}
	}

	relayout(): void {
		if (this.open) this.draw();
	}

	private layout(lines: number) {
		const cam = this.scene.cameras.main;
		const width = Math.min(cam.width - 8, 300);
		const height = Math.max(LINES, lines) * this.lineHeight + PADDING * 2;
		const x = Math.floor((cam.width - width) / 2);
		const y = cam.height - height - 4;
		return { x, y, width, height };
	}

	private draw(): void {
		const m = this.mode;
		if (m.kind === "closed") return;
		const rows = m.kind === "choices" ? m.choices.length : LINES;
		const { x, y, width, height } = this.layout(rows);
		const g = this.frame.clear();
		g.fillStyle(0x0b1320, 0.94).fillRect(x, y, width, height);
		g.lineStyle(1, 0xe8f5e9, 1).strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
		g.lineStyle(1, 0x1dc672, 1).strokeRect(x + 2.5, y + 2.5, width - 5, height - 5);

		if (m.kind === "text") {
			const full = m.pages[m.page].join("\n");
			this.label.setText(full.slice(0, Math.floor(m.revealed))).setPosition(x + PADDING, y + PADDING);
			// "More" arrow once the page is fully shown.
			if (m.revealed >= full.length && this.blinkOn) {
				const ax = x + width - PADDING - 5;
				const ay = y + height - PADDING - 4;
				g.fillStyle(0x46e294, 1).fillTriangle(ax, ay, ax + 5, ay, ax + 2.5, ay + 3);
			}
		} else {
			this.label.setText(m.choices.join("\n")).setPosition(x + PADDING + CHOICE_INDENT, y + PADDING);
			const cy = y + PADDING + m.selected * this.lineHeight + Math.floor(this.lineHeight / 2) - 3;
			g.fillStyle(0x46e294, 1).fillTriangle(x + PADDING, cy, x + PADDING, cy + 6, x + PADDING + 4, cy + 3);
		}

		const showName = m.kind === "text" && this.speaker;
		this.nameTag.setText(showName ? this.speaker! : "").setVisible(Boolean(showName));
		if (showName) {
			const w = this.nameTag.getTextBounds().local.width + 8;
			g.fillStyle(0x0b1320, 1).fillRect(x + 4, y - this.lineHeight + 2, w, this.lineHeight);
			g.lineStyle(1, 0x1dc672, 1).strokeRect(x + 4.5, y - this.lineHeight + 2.5, w - 1, this.lineHeight - 1);
			this.nameTag.setPosition(x + 8, y - this.lineHeight + 3);
		}
	}
}
