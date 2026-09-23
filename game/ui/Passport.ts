// Fjord Passport UI (docs/game/PLAN.md M2.10): the stamp banner shown when a stamp is
// earned, and the passport page listing every place.
import Phaser from "phaser";
import { STAMP_PLACES } from "../progress/passport";

const FONT = "pixel";
const FRAME = "ui:frame";
const SLICE = [8, 8, 8, 9] as const;
const INK = 0x3b2a3a;
const STAMP_RED = 0xb3261e;
const FADED = 0x9c8a78;
const DEPTH = 110_000;

function frame(scene: Phaser.Scene, w: number, h: number) {
	return scene.add.nineslice(0, 0, FRAME, undefined, w, h, ...SLICE).setOrigin(0);
}

/** A round rubber-stamp mark centred on (x, y); faded and empty when not earned. */
function drawStamp(g: Phaser.GameObjects.Graphics, x: number, y: number, earned: boolean) {
	if (!earned) {
		g.lineStyle(1, FADED, 1).strokeCircle(x, y, 5);
		return;
	}
	g.lineStyle(2, STAMP_RED, 1).strokeCircle(x, y, 5);
	g.lineStyle(2, STAMP_RED, 1).beginPath().moveTo(x - 3, y).lineTo(x - 1, y + 2).lineTo(x + 3, y - 2).strokePath();
}

const placeName = (id: string) => STAMP_PLACES.find((p) => p.id === id)?.name ?? id;

/** "Stamped! Library 4/10" banner at the top of the screen. */
export class StampToast {
	private container?: Phaser.GameObjects.Container;

	constructor(private readonly scene: Phaser.Scene) {}

	show(place: string, count: number, reducedMotion: boolean): void {
		this.container?.destroy();
		const scene = this.scene;
		const cam = scene.cameras.main;
		const text = scene.add.bitmapText(0, 0, FONT, `Stamped: ${placeName(place)}  ${count}/${STAMP_PLACES.length}`).setTint(INK);
		const w = Math.min(cam.width - 8, Math.ceil(text.getTextBounds().local.width) + 40);
		const h = 30;
		const box = frame(scene, w, h);
		const g = scene.add.graphics();
		drawStamp(g, 16, h / 2, true);
		text.setPosition(28, Math.floor((h - text.getTextBounds().local.height) / 2) - 1);
		const x = Math.floor((cam.width - w) / 2);
		this.container = scene.add.container(x, 6, [box, g, text]).setScrollFactor(0).setDepth(DEPTH);

		if (!reducedMotion) {
			// The stamp lands: drop in from above with a little overshoot.
			this.container.y = -h;
			scene.tweens.add({ targets: this.container, y: 6, duration: 260, ease: "Back.Out" });
			cam.shake(120, 0.004);
		}
		scene.tweens.add({
			targets: this.container,
			alpha: 0,
			delay: 2600,
			duration: 400,
			onComplete: () => this.container?.destroy(),
		});
	}
}

/** The passport page: every stampable place, earned or not. */
export class PassportPanel {
	private container?: Phaser.GameObjects.Container;

	constructor(private readonly scene: Phaser.Scene) {}

	get open(): boolean {
		return Boolean(this.container);
	}

	show(stamps: readonly string[]): void {
		this.close();
		const scene = this.scene;
		const cam = scene.cameras.main;
		const lineHeight = scene.cache.bitmapFont.get(FONT).data.lineHeight;
		const columns = cam.width >= 300 ? 2 : 1;
		const rows = Math.ceil(STAMP_PLACES.length / columns);
		const columnWidth = columns === 2 ? 142 : Math.min(cam.width - 24, 170);
		const w = columns * columnWidth + 24;
		const earned = STAMP_PLACES.filter((p) => stamps.includes(p.id)).length;
		const hintText = earned === STAMP_PLACES.length ? "Full passport. Every stamp in town!" : "Talk to people to collect stamps.";
		const hint = scene.add.bitmapText(12, 0, FONT, hintText).setTint(FADED).setMaxWidth(w - 24);
		const hintHeight = Math.ceil(hint.getTextBounds().local.height);
		const listTop = 9 + Math.round(1.5 * lineHeight);
		const listBottom = listTop + rows * lineHeight;
		const h = listBottom + 6 + hintHeight + 12;
		hint.y = listBottom + 6;
		const x = Math.floor((cam.width - w) / 2);
		const y = Math.max(4, Math.floor((cam.height - h) / 2));

		const parts: Phaser.GameObjects.GameObject[] = [frame(scene, w, h)];
		const g = scene.add.graphics();
		parts.push(g);
		parts.push(scene.add.bitmapText(12, 9, FONT, "Fjord Passport").setTint(INK));
		const counter = scene.add.bitmapText(0, 9, FONT, `${earned}/${STAMP_PLACES.length}`).setTint(STAMP_RED);
		counter.x = w - 12 - counter.getTextBounds().local.width;
		parts.push(counter);

		STAMP_PLACES.forEach((place, i) => {
			const col = columns === 2 ? i % 2 : 0;
			const row = columns === 2 ? Math.floor(i / 2) : i;
			const px = 12 + col * columnWidth;
			const py = listTop + row * lineHeight;
			const has = stamps.includes(place.id);
			drawStamp(g, px + 6, py + Math.floor(lineHeight / 2) - 1, has);
			parts.push(scene.add.bitmapText(px + 16, py, FONT, place.name).setTint(has ? INK : FADED));
		});
		parts.push(hint);
		this.container = scene.add.container(x, y, parts).setScrollFactor(0).setDepth(DEPTH + 1);
	}

	close(): void {
		this.container?.destroy();
		this.container = undefined;
	}
}
