// The credits rolling up the screen over the scene, from content/credits.json. Interact or a tap speeds it up for a moment, back ends
// it, and it ends by itself. With reduced motion it doesn't scroll: the whole list shows
// at once until dismissed.
import Phaser from "phaser";
import type { EngineContent } from "../data.ts";
import type { FrameInput } from "../input/InputController.ts";

const DEPTH = 115_000;
const INK = 0xf2eef7;
const HEADING = 0x7ee0a8;
/**
 * Pixels a second, how much faster after interact or a tap, and for how long. 20 is a
 * whole pixel every third frame at 60 fps, so the roll steps evenly instead of stuttering.
 */
const SPEED = 20;
const FAST = 6;
const FAST_MS = 900;

export class CreditsRoll {
	private readonly shade: Phaser.GameObjects.Rectangle;
	private readonly column: Phaser.GameObjects.Container;
	private readonly height: number;
	/**
	 * Where the column is, kept as a fraction; the container is drawn at the whole pixel
	 * below it. At a fraction the pixel font loses rows of its glyphs ("o" turns to "c").
	 */
	private y: number;
	private done = false;
	private fastMs = 0;

	constructor(
		private readonly scene: Phaser.Scene,
		credits: EngineContent["credits"],
		private readonly reducedMotion: boolean,
		private readonly onDone: () => void,
	) {
		const cam = scene.cameras.main;
		this.shade = scene.add.rectangle(0, 0, cam.width, cam.height, 0x050a14, 0.6).setOrigin(0).setScrollFactor(0).setDepth(DEPTH);
		const lines: { text: string; tint: number; gap: number }[] = [
			{ text: credits.title, tint: HEADING, gap: 0 },
			{ text: credits.byline, tint: INK, gap: 4 },
			...credits.sections.flatMap((s) => [{ text: s.heading, tint: HEADING, gap: 18 }, ...s.lines.map((l) => ({ text: l, tint: INK, gap: 2 }))]),
			{ text: credits.thanks, tint: HEADING, gap: 26 },
		];
		const parts: Phaser.GameObjects.BitmapText[] = [];
		let y = 0;
		for (const line of lines) {
			y += line.gap;
			const text = scene.add.bitmapText(0, y, "pixel", line.text).setTint(line.tint);
			// Centred by hand at a whole pixel: origin 0.5 puts odd widths on half pixels.
			text.x = -Math.round(text.width / 2);
			parts.push(text);
			y += Math.ceil(text.height);
		}
		this.height = y;
		this.column = scene.add.container(Math.round(cam.width / 2), cam.height, parts).setScrollFactor(0).setDepth(DEPTH + 1);
		this.y = cam.height;
		// Reduced motion: no scrolling, the whole list centred (it fits a phone screen).
		if (reducedMotion) this.column.y = this.y = Math.round((cam.height - this.height) / 2);
	}

	/** Returns true once finished. */
	update(dtMs: number, input: FrameInput): boolean {
		if (this.done) return true;
		const cam = this.scene.cameras.main;
		if (this.reducedMotion) {
			if (input.interact || input.back || input.taps.length) this.finish();
			return this.done;
		}
		if (input.interact || input.taps.length) this.fastMs = FAST_MS;
		this.fastMs = Math.max(0, this.fastMs - dtMs);
		const speed = SPEED * (this.fastMs > 0 ? FAST : 1);
		this.y -= (speed * dtMs) / 1000;
		this.column.y = Math.round(this.y);
		if (input.back) this.finish();
		if (this.y + this.height < cam.height / 3) this.finish();
		return this.done;
	}

	private finish(): void {
		this.done = true;
		this.shade.destroy();
		this.column.destroy();
		this.onDone();
	}
}
