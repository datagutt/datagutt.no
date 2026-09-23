// In-engine dialogue box (docs/game/PLAN.md M1.6, growing into M2.4): a typewriter
// reveal of paged text, and a choice list for Ink choices. Input is fed in by the scene.
import Phaser from "phaser";
import type { Facing } from "../world/objects";
import { PORTRAIT_CROP, portraitKey } from "../characters/sheet";
import { charDelayMs, paginate, wrapText } from "./text";

const FONT = "pixel";
const FRAME = "ui:frame";
/** Nine-slice insets of the wood frame (px of ui/frame.png that must not stretch). */
const SLICE = { left: 8, right: 8, top: 8, bottom: 9 };
const PADDING = 9;
const LINES = 3;
const CHOICE_INDENT = 10;
const PORTRAIT_SCALE = 2;
const PORTRAIT_SIZE = PORTRAIT_CROP.size * PORTRAIT_SCALE;
const INK = 0x3b2a3a;
const ACCENT = 0x8a3c1a;

type Mode =
	| { kind: "closed" }
	| {
			kind: "text";
			pages: string[][];
			page: number;
			revealed: number;
			timer: number;
			onDone: () => void;
			portrait: string | null;
			onChar: ((text: string, index: number) => void) | null;
	  }
	| { kind: "choices"; choices: string[]; selected: number; onPick: (index: number) => void };

export class DialogueBox {
	private readonly container: Phaser.GameObjects.Container;
	private readonly box: Phaser.GameObjects.NineSlice;
	private readonly tagBox: Phaser.GameObjects.NineSlice;
	private readonly marks: Phaser.GameObjects.Graphics;
	private readonly label: Phaser.GameObjects.BitmapText;
	private readonly nameTag: Phaser.GameObjects.BitmapText;
	private readonly measurer: Phaser.GameObjects.BitmapText;
	private readonly face: Phaser.GameObjects.Sprite;
	/** A nod or head shake is playing; talking resumes when it ends. */
	private gesturing = false;
	private mode: Mode = { kind: "closed" };
	private speaker: string | null = null;
	private blinkOn = true;

	constructor(private readonly scene: Phaser.Scene) {
		const slice = (w: number, h: number) =>
			scene.add.nineslice(0, 0, FRAME, undefined, w, h, SLICE.left, SLICE.right, SLICE.top, SLICE.bottom).setOrigin(0);
		this.box = slice(100, 40);
		this.tagBox = slice(40, 20);
		this.marks = scene.add.graphics();
		this.label = scene.add.bitmapText(0, 0, FONT, "").setTint(INK);
		this.nameTag = scene.add.bitmapText(0, 0, FONT, "").setTint(ACCENT);
		this.measurer = scene.add.bitmapText(-1000, -1000, FONT, "").setVisible(false);
		this.face = scene.add.sprite(0, 0, "__DEFAULT").setOrigin(0).setScale(PORTRAIT_SCALE).setVisible(false);
		this.face.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => (this.gesturing = false));
		this.container = scene.add
			.container(0, 0, [this.tagBox, this.box, this.marks, this.face, this.nameTag, this.label])
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

	/**
	 * Show a line of text; `onDone` runs when the player dismisses its last page.
	 * `portrait` is a character id with a portrait sheet; `gesture` plays once first.
	 */
	say(
		text: string,
		speaker: string | null,
		onDone: () => void,
		options: {
			portrait?: string | null;
			gesture?: "nod" | "shake" | null;
			/** Called as each character appears (dialogue blips). */
			onChar?: (text: string, index: number) => void;
		} = {},
	): void {
		const portrait = options.portrait && this.scene.textures.exists(portraitKey(options.portrait)) ? options.portrait : null;
		const { width } = this.layout(LINES);
		const textWidth = width - PADDING * 2 - (portrait ? PORTRAIT_SIZE + PADDING : 0);
		this.speaker = speaker;
		this.mode = {
			kind: "text",
			pages: paginate(wrapText(text, textWidth, this.measure), LINES),
			page: 0,
			revealed: 0,
			timer: 0,
			onDone,
			portrait,
			onChar: options.onChar ?? null,
		};
		this.face.setVisible(Boolean(portrait));
		if (portrait) {
			this.gesturing = Boolean(options.gesture);
			this.face.play(portraitKey(portrait, options.gesture ?? "talk"));
		}
		this.container.setVisible(true);
		this.draw();
	}

	/** Show choices; `onPick` receives the chosen index. */
	choose(choices: string[], onPick: (index: number) => void): void {
		this.face.setVisible(false);
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
				m.timer = 0;
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

	/** Choices on screen, for the ?debug readout. */
	get currentChoices(): string[] | null {
		return this.mode.kind === "choices" ? this.mode.choices : null;
	}

	/** Index of the highlighted choice, or null when not choosing. */
	get selectedChoice(): number | null {
		return this.mode.kind === "choices" ? this.mode.selected : null;
	}

	/** Which choice row is at game-screen coordinates, if any. */
	choiceAt(screenX: number, screenY: number): number | null {
		const m = this.mode;
		if (m.kind !== "choices") return null;
		const { x, y, width } = this.layout(m.choices.length);
		const row = Math.floor((screenY - y - PADDING) / this.lineHeight);
		return screenX >= x && screenX <= x + width && row >= 0 && row < m.choices.length ? row : null;
	}

	/** A tap at screen coordinates: picks the choice under it, or acts like interact. */
	tap(screenX: number, screenY: number): void {
		const m = this.mode;
		if (m.kind === "choices") {
			const row = this.choiceAt(screenX, screenY);
			if (row !== null) {
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
			this.animateFace(m.portrait, m.revealed < full.length);
			if (m.revealed < full.length) {
				m.timer += dtMs;
				while (m.revealed < full.length && m.timer >= charDelayMs(full, m.revealed)) {
					m.timer -= charDelayMs(full, m.revealed);
					m.onChar?.(full, m.revealed);
					m.revealed++;
				}
				this.draw();
			} else if (blink !== this.blinkOn) {
				this.blinkOn = blink;
				this.draw();
			}
		}
	}

	/** Mouth moves while text is appearing and rests on the first frame when it stops. */
	private animateFace(portrait: string | null, talking: boolean): void {
		if (!portrait || this.gesturing) return;
		const talk = portraitKey(portrait, "talk");
		if (talking && !(this.face.anims.isPlaying && this.face.anims.currentAnim?.key === talk)) {
			this.face.play(talk);
		} else if (!talking && this.face.anims.isPlaying) {
			this.face.anims.stop();
			this.face.setFrame(0);
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
		this.box.setPosition(x, y).setSize(width, height);
		const g = this.marks.clear();

		if (m.kind === "text") {
			const full = m.pages[m.page].join("\n");
			const textX = x + PADDING + (m.portrait ? PORTRAIT_SIZE + PADDING : 0);
			this.label.setText(full.slice(0, m.revealed)).setPosition(textX, y + PADDING);
			if (m.portrait) this.face.setPosition(x + PADDING - 2, y + Math.floor((height - PORTRAIT_SIZE) / 2));
			// "More" arrow once the page is fully shown.
			if (m.revealed >= full.length && this.blinkOn) {
				const ax = x + width - PADDING - 5;
				const ay = y + height - PADDING - 3;
				g.fillStyle(ACCENT, 1).fillTriangle(ax, ay, ax + 5, ay, ax + 2.5, ay + 3);
			}
		} else {
			this.label.setText(m.choices.join("\n")).setPosition(x + PADDING + CHOICE_INDENT, y + PADDING);
			const cy = y + PADDING + m.selected * this.lineHeight + Math.floor(this.lineHeight / 2) - 3;
			g.fillStyle(ACCENT, 1).fillTriangle(x + PADDING, cy, x + PADDING, cy + 6, x + PADDING + 4, cy + 3);
		}

		const showName = m.kind === "text" && this.speaker;
		this.nameTag.setText(showName ? this.speaker! : "").setVisible(Boolean(showName));
		this.tagBox.setVisible(Boolean(showName));
		if (showName) {
			// A small tab of the same frame, tucked behind the top-left of the box.
			const w = Math.max(SLICE.left + SLICE.right + 4, this.nameTag.getTextBounds().local.width + 14);
			const h = this.lineHeight + 10;
			this.tagBox.setPosition(x + 6, y - h + 7).setSize(w, h);
			this.nameTag.setPosition(x + 13, y - h + 11);
		}
	}
}
