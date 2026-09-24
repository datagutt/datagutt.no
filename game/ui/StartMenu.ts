// START menu (docs/game/PLAN.md M2.11): Passport, datagutt's live status, Journal,
// Settings, Credits. Opened with Enter, Start on a gamepad, or the on-screen Menu button.
// Items that depend on later milestones (other visitors) join the list when they exist.
import Phaser from "phaser";
import type { Facing } from "../world/objects";
import { PassportPanel } from "./Passport";
import { credits } from "../../content/credits";
import type { EffectsSetting } from "../save/save";

const FONT = "pixel";
const FRAME = "ui:frame";
const SLICE = [8, 8, 8, 9] as const;
const INK = 0x3b2a3a;
const ACCENT = 0x8a3c1a;
const FADED = 0x9c8a78;
const DEPTH = 120_000;

export type MenuSettings = { muted: boolean; music: boolean; reducedMotion: boolean | null; showVisitors: boolean; effects: EffectsSetting };

export type MenuHooks = {
	stamps(): readonly string[];
	settings(): MenuSettings;
	changeSettings(next: MenuSettings): void;
	openJournal(): void;
	/** Thomas's live status, one line each (game/live/datagutt.ts statusLines). */
	status(): string[];
	sound(kind: "open" | "move" | "select"): void;
};

type View = "closed" | "main" | "passport" | "settings" | "credits" | "status";

const CREDITS = [`${credits.title}, ${credits.byline.toLowerCase()}.`, ...credits.sections.map((s) => `${s.heading}: ${s.lines.join(" ")}`)];

export class StartMenu {
	private view: View = "closed";
	private selected = 0;
	private container?: Phaser.GameObjects.Container;
	private readonly passport: PassportPanel;
	private rows: { x: number; y: number; w: number; h: number }[] = [];

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly hooks: MenuHooks,
	) {
		this.passport = new PassportPanel(scene);
	}

	get open(): boolean {
		return this.view !== "closed";
	}

	get currentView(): View {
		return this.view;
	}

	show(): void {
		this.hooks.sound("open");
		this.view = "main";
		this.selected = 0;
		this.render();
	}

	close(): void {
		this.view = "closed";
		this.passport.close();
		this.container?.destroy();
		this.container = undefined;
	}

	/** Handle one frame of input while open. */
	handle(input: { dirPresses: Facing[]; interact: boolean; back: boolean; menu: boolean; taps: { screenX: number; screenY: number }[] }): void {
		if (this.view === "passport" || this.view === "credits" || this.view === "status") {
			if (input.interact || input.back || input.menu || input.taps.length) this.backToMain();
			return;
		}
		if (input.menu) return this.close();
		if (input.back) return this.view === "main" ? this.close() : this.backToMain();
		for (const dir of input.dirPresses) {
			const count = this.items().length;
			if (dir === "up") this.selected = (this.selected + count - 1) % count;
			if (dir === "down") this.selected = (this.selected + 1) % count;
			this.hooks.sound("move");
			this.render();
		}
		for (const tap of input.taps) {
			const row = this.rows.findIndex((r) => tap.screenX >= r.x && tap.screenX <= r.x + r.w && tap.screenY >= r.y && tap.screenY <= r.y + r.h);
			if (row === -1) {
				// Tapping outside the panel closes it.
				if (this.view === "main") this.close();
				else this.backToMain();
				return;
			}
			this.selected = row;
			this.activate();
			return;
		}
		if (input.interact) this.activate();
	}

	private backToMain(): void {
		this.passport.close();
		this.view = "main";
		this.selected = 0;
		this.render();
	}

	private items(): { label: string; run: () => void }[] {
		if (this.view === "settings") {
			const s = this.hooks.settings();
			const motion = s.reducedMotion === null ? "Auto" : s.reducedMotion ? "On" : "Off";
			return [
				{ label: `Sound: ${s.muted ? "Off" : "On"}`, run: () => this.hooks.changeSettings({ ...s, muted: !s.muted }) },
				{ label: `Music: ${s.music ? "On" : "Off"}`, run: () => this.hooks.changeSettings({ ...s, music: !s.music }) },
				{ label: `Other visitors: ${s.showVisitors ? "On" : "Off"}`, run: () => this.hooks.changeSettings({ ...s, showVisitors: !s.showVisitors }) },
				{
					label: `Effects: ${s.effects === "auto" ? "Auto" : s.effects === "high" ? "High" : "Low"}`,
					run: () => this.hooks.changeSettings({ ...s, effects: s.effects === "auto" ? "high" : s.effects === "high" ? "low" : "auto" }),
				},
				{
					label: `Reduced motion: ${motion}`,
					run: () => this.hooks.changeSettings({ ...s, reducedMotion: s.reducedMotion === null ? true : s.reducedMotion ? false : null }),
				},
				{ label: "Back", run: () => this.backToMain() },
			];
		}
		return [
			{ label: "Passport", run: () => this.showPassport() },
			{ label: "datagutt's status", run: () => this.openView("status") },
			{ label: "Journal (plain text)", run: () => this.hooks.openJournal() },
			{ label: "Settings", run: () => this.openView("settings") },
			{ label: "Credits", run: () => this.openView("credits") },
			{ label: "Close", run: () => this.close() },
		];
	}

	private activate(): void {
		this.hooks.sound("select");
		this.items()[this.selected]?.run();
		if (this.view === "settings") this.render();
	}

	private openView(view: View): void {
		this.view = view;
		this.selected = 0;
		this.render();
	}

	private showPassport(): void {
		this.view = "passport";
		this.container?.destroy();
		this.container = undefined;
		this.rows = [];
		this.passport.show(this.hooks.stamps());
	}

	private render(): void {
		this.container?.destroy();
		this.rows = [];
		if (this.view === "closed" || this.view === "passport") return;
		const scene = this.scene;
		const cam = scene.cameras.main;
		const lh = scene.cache.bitmapFont.get(FONT).data.lineHeight;
		const parts: Phaser.GameObjects.GameObject[] = [];
		const g = scene.add.graphics();

		if (this.view === "credits" || this.view === "status") {
			const text = this.view === "credits" ? CREDITS.join("\n\n") : this.hooks.status().join("\n");
			const w = Math.min(cam.width - 16, 300);
			const body = scene.add.bitmapText(12, 9 + lh + 6, FONT, text).setTint(INK).setMaxWidth(w - 24);
			const bodyBottom = 9 + lh + 6 + Math.ceil(body.getTextBounds().local.height);
			const hint = scene.add.bitmapText(12, bodyBottom + 8, FONT, "Tap or press E to go back.").setTint(FADED).setMaxWidth(w - 24);
			const h = bodyBottom + 8 + Math.ceil(hint.getTextBounds().local.height) + 12;
			parts.push(scene.add.nineslice(0, 0, FRAME, undefined, w, h, ...SLICE).setOrigin(0), body, hint);
			parts.push(scene.add.bitmapText(12, 9, FONT, this.view === "credits" ? "Credits" : "datagutt's status").setTint(ACCENT));
			this.container = scene.add
				.container(Math.floor((cam.width - w) / 2), Math.max(4, Math.floor((cam.height - h) / 2)), parts)
				.setScrollFactor(0)
				.setDepth(DEPTH);
			return;
		}

		const items = this.items();
		const title = this.view === "settings" ? "Settings" : "Menu";
		const w = Math.min(cam.width - 16, 200);
		const h = 9 + lh + 4 + items.length * lh + 10;
		const x = Math.floor((cam.width - w) / 2);
		const y = Math.max(4, Math.floor((cam.height - h) / 2));
		parts.push(scene.add.nineslice(0, 0, FRAME, undefined, w, h, ...SLICE).setOrigin(0), g);
		parts.push(scene.add.bitmapText(12, 9, FONT, title).setTint(ACCENT));
		items.forEach((item, i) => {
			const ry = 9 + lh + 4 + i * lh;
			parts.push(scene.add.bitmapText(24, ry, FONT, item.label).setTint(INK));
			this.rows.push({ x: x + 6, y: y + ry, w: w - 12, h: lh });
		});
		const cy = 9 + lh + 4 + this.selected * lh + Math.floor(lh / 2) - 3;
		g.fillStyle(ACCENT, 1).fillTriangle(12, cy, 12, cy + 6, 16, cy + 3);
		this.container = scene.add.container(x, y, parts).setScrollFactor(0).setDepth(DEPTH);
	}
}

/** Small "Menu" button in the corner, mainly for touch screens. */
export class MenuButton {
	private readonly container: Phaser.GameObjects.Container;
	private bounds = { x: 0, y: 0, w: 0, h: 0 };

	constructor(scene: Phaser.Scene) {
		const label = scene.add.bitmapText(8, 5, FONT, "Menu").setTint(INK);
		const w = Math.ceil(label.getTextBounds().local.width) + 16;
		const h = 22;
		const box = scene.add.nineslice(0, 0, FRAME, undefined, w, h, ...SLICE).setOrigin(0);
		this.container = scene.add.container(4, 4, [box, label]).setScrollFactor(0).setDepth(DEPTH - 1);
		this.bounds = { x: 4, y: 4, w, h };
	}

	hit(screenX: number, screenY: number): boolean {
		const b = this.bounds;
		return screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h;
	}

	setVisible(visible: boolean): void {
		this.container.setVisible(visible);
	}
}
