// A cabinet up close: its screen drawn by one of the games on a canvas texture, framed like a cabinet, over a dimmed room. Back
// leaves. On touch, taps on the screen's sides steer, above turns (up), below presses A,
// and a tap outside the cabinet leaves.
import Phaser from "phaser";
import type { GameData } from "@datagutt/kai/data";
import type { FrameInput, InputDevice } from "@datagutt/kai/input/InputController";
import { SCREEN_H, SCREEN_W, type ArcadeGame, type ArcadeInput, type Direction } from "./types.ts";

const DEPTH = 114_000;
const TEXTURE = "arcade:screen";
const BEZEL = 6;
const MARQUEE = 0xb83a38;
const CREAM = 0xfff4d6;
const CASE = 0x1b2440;

/** What to call the A button in the hint, for the device in hand. */
const BUTTON: Record<InputDevice, string> = { keyboard: "E", gamepad: "A", touch: "TAP" };

export class ArcadeScreen {
	private readonly parts: Phaser.GameObjects.GameObject[] = [];
	private readonly texture: Phaser.Textures.CanvasTexture;
	private readonly screen: Phaser.GameObjects.Image;
	private readonly cabinet: Phaser.GameObjects.Rectangle;
	private readonly hint: Phaser.GameObjects.BitmapText;
	private held = new Set<Direction>();
	private device: InputDevice | null = null;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly game: ArcadeGame,
		private readonly data: GameData,
		private readonly onClose: () => void,
	) {
		const cam = scene.cameras.main;
		// The largest whole scale that leaves room for the marquee and three lines of hint.
		const scale = Math.max(1, Math.floor(Math.min((cam.width - 24) / SCREEN_W, (cam.height - 70) / SCREEN_H)));
		const w = SCREEN_W * scale;
		const h = SCREEN_H * scale;
		const x = Math.round((cam.width - w) / 2);
		const y = Math.round((cam.height - h) / 2) - 14;
		const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.GameObject>(o: T, depth = 0) => {
			o.setScrollFactor(0).setDepth(DEPTH + depth);
			this.parts.push(o);
			return o;
		};

		fixed(scene.add.rectangle(0, 0, cam.width, cam.height, 0x050a14, 0.8).setOrigin(0));
		this.cabinet = fixed(scene.add.rectangle(x - BEZEL, y - BEZEL - 18, w + BEZEL * 2, h + BEZEL * 2 + 50, CASE).setOrigin(0).setStrokeStyle(2, CREAM), 1);
		fixed(scene.add.rectangle(x - BEZEL + 2, y - BEZEL - 16, w + BEZEL * 2 - 4, 16, MARQUEE).setOrigin(0), 2);
		fixed(scene.add.bitmapText(x + w / 2, y - BEZEL - 8, "pixel", game.title.toUpperCase()).setOrigin(0.5).setTint(CREAM), 3);

		this.texture = scene.textures.exists(TEXTURE) ? (scene.textures.get(TEXTURE) as Phaser.Textures.CanvasTexture) : scene.textures.createCanvas(TEXTURE, SCREEN_W, SCREEN_H)!;
		this.screen = fixed(scene.add.image(x, y, TEXTURE).setOrigin(0).setScale(scale), 2);
		this.hint = fixed(scene.add.bitmapText(x + w / 2, y + h + BEZEL, "pixel", "").setOrigin(0.5, 0).setCenterAlign().setTint(CREAM), 3);
		this.draw();
	}

	/** One frame. Returns false once the player has stepped away. */
	update(dtMs: number, input: FrameInput): boolean {
		if (input.back || input.taps.some((t) => !this.cabinet.getBounds().contains(t.screenX, t.screenY))) {
			this.close();
			return false;
		}
		if (input.device !== this.device) {
			this.device = input.device;
			const t = this.data.t.bind(this.data);
			const back = input.device === "touch" ? t("arcade.leaveTouch") : t("arcade.leave", { button: input.device === "gamepad" ? "B" : "Esc" });
			const lines = this.game.hint.replace(/\bA:/g, `${BUTTON[input.device]}:`).split(/\s{2,}/);
			this.hint.setText([...lines, back].map((l) => l.toUpperCase()));
			// The case reaches down past however many lines the hint has.
			const text = this.hint.getTextBounds(true).global;
			this.cabinet.setSize(this.cabinet.width, text.y + text.height + 6 - this.cabinet.y);
			// Then the whole cabinet moves to sit in the middle of the screen.
			const dy = Math.round((this.scene.cameras.main.height - this.cabinet.height) / 2) - this.cabinet.y;
			for (const part of this.parts.slice(1)) (part as unknown as { y: number }).y += dy;
		}
		const pressed = new Set<Direction>(input.dirPresses);
		let a = input.interact;
		for (const tap of input.taps) {
			const zone = this.zoneOf(tap.screenX, tap.screenY);
			if (zone === "a") a = true;
			else if (zone) pressed.add(zone);
		}
		// Keys and pads hold one direction at a time; a tap is a press, held for one frame.
		this.held = new Set(input.dir ? [input.dir] : []);
		const frame: ArcadeInput = { held: new Set([...this.held, ...pressed]), pressed, a };
		this.game.step(dtMs, frame);
		this.draw();
		return true;
	}

	/** Where a tap on the screen steers: the left and right thirds, the top and bottom of the middle. */
	private zoneOf(sx: number, sy: number): Direction | "a" | null {
		const b = this.screen.getBounds();
		if (!b.contains(sx, sy)) return sx < b.left ? "left" : sx > b.right ? "right" : sy > b.bottom ? "a" : null;
		const fx = (sx - b.left) / b.width;
		const fy = (sy - b.top) / b.height;
		if (fx < 1 / 3) return "left";
		if (fx > 2 / 3) return "right";
		return fy < 0.5 ? "up" : "a";
	}

	private draw(): void {
		this.game.draw(this.texture.context);
		this.texture.refresh();
	}

	close(): void {
		for (const part of this.parts) part.destroy();
		this.onClose();
	}
}
