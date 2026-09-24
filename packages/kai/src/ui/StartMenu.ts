// START menu: Passport, the plugins' items, Settings, Credits. Opened with Enter, Start on
// a gamepad, or the on-screen Menu button. A plugin's item runs an action or opens a page
// of text.
import Phaser from "phaser";
import type { Facing } from "../world/objects.ts";
import { PassportPanel } from "./Passport.ts";
import type { MenuItem } from "../plugins/api.ts";
import type { EffectsSetting } from "../save/save.ts";
import type { GameData } from "../data.ts";

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
	/** Earned achievement ids. */
	achievements(): readonly string[];
	settings(): MenuSettings;
	changeSettings(next: MenuSettings): void;
	/** The plugins' items, shown after the Passport. */
	items(): MenuItem[];
	sound(kind: "open" | "move" | "select"): void;
};

/** A built-in view, or the id of a plugin's page of text. */
type View = "closed" | "main" | "passport" | "settings" | "credits" | (string & {});

type Page = { title: string; lines: string[] };

/** The credits as one paragraph per section, for the menu's page. */
function creditLines({ title, byline, sections }: GameData["content"]["credits"]): string[] {
	return [`${title}, ${byline.toLowerCase()}.`, ...sections.map((s) => `${s.heading}: ${s.lines.join(" ")}`)];
}

export class StartMenu {
	private view: View = "closed";
	private selected = 0;
	private passportPage = 0;
	private container?: Phaser.GameObjects.Container;
	private readonly passport: PassportPanel;
	private rows: { x: number; y: number; w: number; h: number }[] = [];
	/** The page of text on show (credits, or a plugin's page). */
	private page: Page | null = null;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly data: GameData,
		private readonly hooks: MenuHooks,
	) {
		this.passport = new PassportPanel(scene, data);
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
		if (this.view === "passport") {
			// Left and right, or a tap on the page, turn it; anything else goes back.
			const turn = input.dirPresses.some((d) => d === "left" || d === "right") || input.taps.some((t) => this.passport.bounds.contains(t.screenX, t.screenY));
			if (turn) {
				this.passportPage = 1 - this.passportPage;
				this.hooks.sound("move");
				this.passport.show(this.hooks.stamps(), this.hooks.achievements(), this.passportPage);
			} else if (input.interact || input.back || input.menu || input.taps.length) this.backToMain();
			return;
		}
		if (this.page) {
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
		this.page = null;
		this.view = "main";
		this.selected = 0;
		this.render();
	}

	private items(): { label: string; run: () => void }[] {
		if (this.view === "settings") {
			const s = this.hooks.settings();
			const onOff = (on: boolean) => ({ value: this.data.t(on ? "value.on" : "value.off") });
			const motion = s.reducedMotion === null ? this.data.t("value.auto") : this.data.t(s.reducedMotion ? "value.on" : "value.off");
			return [
				{ label: this.data.t("settings.sound", onOff(!s.muted)), run: () => this.hooks.changeSettings({ ...s, muted: !s.muted }) },
				{ label: this.data.t("settings.music", onOff(s.music)), run: () => this.hooks.changeSettings({ ...s, music: !s.music }) },
				{ label: this.data.t("settings.visitors", onOff(s.showVisitors)), run: () => this.hooks.changeSettings({ ...s, showVisitors: !s.showVisitors }) },
				{
					label: this.data.t("settings.effects", { value: this.data.t(s.effects === "auto" ? "value.auto" : s.effects === "high" ? "value.high" : "value.low") }),
					run: () => this.hooks.changeSettings({ ...s, effects: s.effects === "auto" ? "high" : s.effects === "high" ? "low" : "auto" }),
				},
				{
					label: this.data.t("settings.reducedMotion", { value: motion }),
					run: () => this.hooks.changeSettings({ ...s, reducedMotion: s.reducedMotion === null ? true : s.reducedMotion ? false : null }),
				},
				{ label: this.data.t("menu.back"), run: () => this.backToMain() },
			];
		}
		const own = this.hooks.items().map((item) => ({
			label: item.label,
			run: "run" in item ? () => item.run() : () => this.openPage(item.id, { title: item.title, lines: item.lines() }),
		}));
		return [
			{ label: this.data.t("menu.passport"), run: () => this.showPassport() },
			...own,
			{ label: this.data.t("menu.settings"), run: () => this.openView("settings") },
			{ label: this.data.t("menu.credits"), run: () => this.openPage("credits", { title: this.data.t("credits.title"), lines: creditLines(this.data.content.credits) }) },
			{ label: this.data.t("menu.close"), run: () => this.close() },
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

	private openPage(view: string, page: Page): void {
		this.page = page;
		this.openView(view);
	}

	private showPassport(): void {
		this.view = "passport";
		this.container?.destroy();
		this.container = undefined;
		this.rows = [];
		this.passportPage = 0;
		this.passport.show(this.hooks.stamps(), this.hooks.achievements(), 0);
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

		if (this.page) {
			const text = this.page.lines.join(this.view === "credits" ? "\n\n" : "\n");
			const w = Math.min(cam.width - 16, 300);
			const body = scene.add.bitmapText(12, 9 + lh + 6, FONT, text).setTint(INK).setMaxWidth(w - 24);
			const bodyBottom = 9 + lh + 6 + Math.ceil(body.getTextBounds().local.height);
			const hint = scene.add.bitmapText(12, bodyBottom + 8, FONT, this.data.t("menu.backHint")).setTint(FADED).setMaxWidth(w - 24);
			const h = bodyBottom + 8 + Math.ceil(hint.getTextBounds().local.height) + 12;
			parts.push(scene.add.nineslice(0, 0, FRAME, undefined, w, h, ...SLICE).setOrigin(0), body, hint);
			parts.push(scene.add.bitmapText(12, 9, FONT, this.page.title).setTint(ACCENT));
			this.container = scene.add
				.container(Math.floor((cam.width - w) / 2), Math.max(4, Math.floor((cam.height - h) / 2)), parts)
				.setScrollFactor(0)
				.setDepth(DEPTH);
			return;
		}

		const items = this.items();
		const title = this.data.t(this.view === "settings" ? "settings.title" : "menu.title");
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

	constructor(scene: Phaser.Scene, data: GameData) {
		const label = scene.add.bitmapText(8, 5, FONT, data.t("menu.button")).setTint(INK);
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
