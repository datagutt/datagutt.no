// Merges keyboard, gamepad and pointer into one set of actions per frame
// (docs/game/PLAN.md M1.9). Scenes read `poll()` and never touch devices directly.
import Phaser from "phaser";
import type { Facing } from "../world/objects";
import { DirectionStack } from "./directionStack";

export type FrameInput = {
	/** Held direction from keys, d-pad or stick. */
	dir: Facing | null;
	run: boolean;
	/** Pressed this frame. */
	interact: boolean;
	back: boolean;
	menu: boolean;
	/** Taps/clicks this frame, in world coordinates. */
	taps: { x: number; y: number }[];
};

const KEY_DIRS: [string, Facing][] = [
	["UP", "up"],
	["W", "up"],
	["DOWN", "down"],
	["S", "down"],
	["LEFT", "left"],
	["A", "left"],
	["RIGHT", "right"],
	["D", "right"],
];

const STICK_DEADZONE = 0.45;
/** A press shorter than this, that moved less than TAP_SLOP pixels, counts as a tap. */
const TAP_MAX_MS = 500;
const TAP_SLOP = 12;

export class InputController {
	private readonly stack = new DirectionStack();
	private readonly keys: Record<string, Phaser.Input.Keyboard.Key> = {};
	private interactQueued = false;
	private backQueued = false;
	private menuQueued = false;
	private taps: { x: number; y: number }[] = [];
	private padPrev = { a: false, b: false, start: false };

	constructor(private readonly scene: Phaser.Scene) {
		const kb = scene.input.keyboard;
		if (kb) {
			for (const [name, dir] of KEY_DIRS) {
				const key = kb.addKey(name);
				key.on("down", () => this.stack.press(dir));
				key.on("up", () => this.stack.release(dir));
				this.keys[name] = key;
			}
			this.keys.SHIFT = kb.addKey("SHIFT");
			for (const name of ["E", "SPACE", "Z"]) kb.addKey(name).on("down", () => (this.interactQueued = true));
			for (const name of ["X", "ESC", "BACKSPACE"]) kb.addKey(name).on("down", () => (this.backQueued = true));
			kb.addKey("ENTER").on("down", () => (this.menuQueued = true));
			// Losing focus (alt-tab) must not leave a direction stuck down.
			scene.game.events.on(Phaser.Core.Events.BLUR, () => this.stack.clear());
		}

		scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
			const dist = Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY);
			if (p.getDuration() <= TAP_MAX_MS && dist <= TAP_SLOP) {
				const world = p.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;
				this.taps.push({ x: world.x, y: world.y });
			}
		});
	}

	private padDirection(pad: Phaser.Input.Gamepad.Gamepad): Facing | null {
		if (pad.up) return "up";
		if (pad.down) return "down";
		if (pad.left) return "left";
		if (pad.right) return "right";
		const x = pad.leftStick.x;
		const y = pad.leftStick.y;
		if (Math.max(Math.abs(x), Math.abs(y)) < STICK_DEADZONE) return null;
		if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
		return y > 0 ? "down" : "up";
	}

	poll(): FrameInput {
		let dir = this.stack.current;
		let run = this.keys.SHIFT?.isDown ?? false;
		let interact = this.interactQueued;
		let back = this.backQueued;
		let menu = this.menuQueued;

		const pad = this.scene.input.gamepad?.pad1;
		if (pad) {
			dir = this.padDirection(pad) ?? dir;
			const a = pad.A;
			const b = pad.B;
			const start = pad.buttons[9]?.pressed ?? false;
			interact ||= a && !this.padPrev.a;
			back ||= b && !this.padPrev.b;
			menu ||= start && !this.padPrev.start;
			run ||= b;
			this.padPrev = { a, b, start };
		}

		const taps = this.taps;
		this.taps = [];
		this.interactQueued = this.backQueued = this.menuQueued = false;
		return { dir, run, interact, back, menu, taps };
	}
}
