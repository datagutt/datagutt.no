// Fjord Passport UI (docs/game/PLAN.md M2.10): the stamp banner shown when a stamp is
// earned, and the passport page listing every place.
import Phaser from "phaser";
import type { GameData } from "../data.ts";

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


/** A mark for an earned achievement: a small star in the stamp's red. */
function drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, earned: boolean) {
	const points = Array.from({ length: 10 }, (_, i) => {
		const r = i % 2 ? 2.2 : 5;
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		return new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r);
	});
	if (earned) g.fillStyle(STAMP_RED, 1).fillPoints(points, true);
	else g.lineStyle(1, FADED, 1).strokePoints(points, true);
}

/** The banner at the top of the screen: "Stamped: Library 4/10", or a new achievement. */
export class StampToast {
	private container?: Phaser.GameObjects.Container;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly data: GameData,
	) {}

	show(place: string, count: number, reducedMotion: boolean): void {
		const { data } = this;
		this.banner(data.t("toast.stamped", { place: data.placeName(place), count, total: data.stampPlaces.length }), drawStamp, reducedMotion);
	}

	showAchievement(name: string, reducedMotion: boolean): void {
		this.banner(this.data.t("toast.achievement", { name }), drawStar, reducedMotion);
	}

	private banner(label: string, mark: typeof drawStamp, reducedMotion: boolean): void {
		this.container?.destroy();
		const scene = this.scene;
		const cam = scene.cameras.main;
		const text = scene.add.bitmapText(0, 0, FONT, label).setTint(INK);
		const w = Math.min(cam.width - 8, Math.ceil(text.getTextBounds().local.width) + 40);
		const h = 30;
		const box = frame(scene, w, h);
		const g = scene.add.graphics();
		mark(g, 16, h / 2, true);
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

/** The passport: page 0 every stampable place, page 1 the achievements, earned or not. */
export class PassportPanel {
	private container?: Phaser.GameObjects.Container;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly data: GameData,
	) {}

	get open(): boolean {
		return Boolean(this.container);
	}

	show(stamps: readonly string[], achievements: readonly string[] = [], page = 0): void {
		this.close();
		const scene = this.scene;
		const cam = scene.cameras.main;
		const lineHeight = scene.cache.bitmapFont.get(FONT).data.lineHeight;
		const columns = cam.width >= 300 ? 2 : 1;
		const columnWidth = columns === 2 ? 142 : Math.min(cam.width - 24, 170);
		const w = columns * columnWidth + 24;
		const entries =
			page === 0
				? this.data.stampPlaces.map((p) => ({ label: p.name, has: stamps.includes(p.id) }))
				: this.data.achievements.map((a) => ({ label: achievements.includes(a.id) ? a.name : this.data.t("passport.unknown"), has: achievements.includes(a.id) }));
		const rows = Math.ceil(entries.length / columns);
		const earned = entries.filter((e) => e.has).length;
		const pageHint = this.data.t("passport.pageHint");
		const hintText = this.data.t(page === 1 ? "passport.achievementsHint" : earned === this.data.stampPlaces.length ? "passport.fullHint" : "passport.stampsHint", { pageHint });
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
		parts.push(scene.add.bitmapText(12, 9, FONT, this.data.t(page === 0 ? "passport.title" : "passport.achievements")).setTint(INK));
		const counter = scene.add.bitmapText(0, 9, FONT, `${earned}/${entries.length}`).setTint(STAMP_RED);
		counter.x = w - 12 - counter.getTextBounds().local.width;
		parts.push(counter);

		entries.forEach(({ label, has }, i) => {
			const col = columns === 2 ? i % 2 : 0;
			const row = columns === 2 ? Math.floor(i / 2) : i;
			const px = 12 + col * columnWidth;
			const py = listTop + row * lineHeight;
			(page === 0 ? drawStamp : drawStar)(g, px + 6, py + Math.floor(lineHeight / 2) - 1, has);
			parts.push(scene.add.bitmapText(px + 16, py, FONT, label).setTint(has ? INK : FADED));
		});
		parts.push(hint);
		this.container = scene.add.container(x, y, parts).setScrollFactor(0).setDepth(DEPTH + 1);
		this.bounds = new Phaser.Geom.Rectangle(x, y, w, h);
	}

	/** Where the open page is on screen, for taps. */
	bounds = new Phaser.Geom.Rectangle();

	close(): void {
		this.container?.destroy();
		this.container = undefined;
	}
}
