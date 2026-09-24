// Merges keyboard, gamepad and pointer into one set of actions per frame
// (docs/game/PLAN.md M1.9). Scenes read `poll()` and never touch devices directly.
import Phaser from "phaser";
import type { Facing } from "@datagutt/kai/world/objects";
import { DirectionStack } from "./directionStack";

export type FrameInput = {
	/** Held direction from keys, d-pad or stick. */
	dir: Facing | null;
	/** Directions newly pressed this frame, in order (menus move one step per press). */
	dirPresses: Facing[];
	run: boolean;
	/** Pressed this frame. */
	interact: boolean;
	back: boolean;
	menu: boolean;
	/** Taps/clicks this frame: world coordinates, plus screen coordinates for UI. */
	taps: { x: number; y: number; screenX: number; screenY: number }[];
	/** Interact has been held long enough to mean more than a press (the emote wheel). Once per hold. */
	interactHeld: boolean;
	/** A pointer held still long enough this frame, once per press (touch's "hold"). */
	longPresses: { x: number; y: number; screenX: number; screenY: number }[];
	/** What the player used last, for button prompts. A mouse counts as the keyboard. */
	device: InputDevice;
};

export type InputDevice = "keyboard" | "gamepad" | "touch";

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
/** Holding interact or a pointer this long is a hold, not a press. */
const HOLD_MS = 400;

/** A link, button or form field on the page has keyboard focus, not the game. */
function focusOnPageControl(): boolean {
	const el = document.activeElement;
	return el instanceof HTMLElement && el.closest("a, button, input, select, textarea, [contenteditable]") !== null;
}

export class InputController {
	private readonly stack = new DirectionStack();
	private readonly keys: Record<string, Phaser.Input.Keyboard.Key> = {};
	private interactQueued = false;
	private backQueued = false;
	private menuQueued = false;
	private taps: FrameInput["taps"] = [];
	private dirPressQueue: Facing[] = [];
	/** When the interact key or button went down, until it comes up; null once reported. */
	private interactSince: number | null = null;
	private interactReported = false;
	private pressReported = false;
	private device: InputDevice = "keyboard";
	private padPrev: { a: boolean; b: boolean; start: boolean; dir: Facing | null } = { a: false, b: false, start: false, dir: null };

	constructor(private readonly scene: Phaser.Scene) {
		const kb = scene.input.keyboard;
		if (kb) {
			// Keys reach the game only while focus is on the game itself. On a link or button
			// (Tab to the Journal link, say) they do what the page does: Enter follows the
			// link. The page never scrolls, so the game needn't swallow any keys either.
			kb.disableGlobalCapture();
			const onDown = (key: Phaser.Input.Keyboard.Key, fn: () => void) =>
				key.on("down", () => {
					if (!focusOnPageControl()) fn();
				});
			kb.on("keydown", () => (this.device = "keyboard"));
			for (const [name, dir] of KEY_DIRS) {
				const key = kb.addKey(name, false);
				onDown(key, () => {
					this.stack.press(dir);
					this.dirPressQueue.push(dir);
				});
				key.on("up", () => this.stack.release(dir));
				this.keys[name] = key;
			}
			this.keys.SHIFT = kb.addKey("SHIFT", false);
			for (const name of ["E", "SPACE", "Z"]) {
				const key = kb.addKey(name, false);
				onDown(key, () => {
					this.interactQueued = true;
					this.startHold();
				});
				key.on("up", () => (this.interactSince = null));
			}
			for (const name of ["X", "ESC", "BACKSPACE"]) onDown(kb.addKey(name, false), () => (this.backQueued = true));
			onDown(kb.addKey("ENTER", false), () => (this.menuQueued = true));
			// Losing focus (alt-tab) must not leave a direction stuck down.
			scene.game.events.on(Phaser.Core.Events.BLUR, () => this.stack.clear());
		}

		scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
			this.pressReported = false;
			this.device = p.wasTouch ? "touch" : "keyboard";
		});
		scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
			const dist = Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY);
			if (p.getDuration() <= TAP_MAX_MS && dist <= TAP_SLOP) {
				const world = p.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;
				this.taps.push({ x: world.x, y: world.y, screenX: p.x, screenY: p.y });
			}
		});
	}

	private startHold(): void {
		if (this.interactSince !== null) return;
		this.interactSince = this.scene.time.now;
		this.interactReported = false;
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
		const dirPresses = this.dirPressQueue;

		const pad = this.scene.input.gamepad?.pad1;
		if (pad) {
			const padDir = this.padDirection(pad);
			if (padDir || pad.A || pad.B || pad.buttons[9]?.pressed) this.device = "gamepad";
			if (padDir && padDir !== this.padPrev.dir) dirPresses.push(padDir);
			dir = padDir ?? dir;
			const a = pad.A;
			const b = pad.B;
			const start = pad.buttons[9]?.pressed ?? false;
			interact ||= a && !this.padPrev.a;
			if (a && !this.padPrev.a) this.startHold();
			if (!a && this.padPrev.a) this.interactSince = null;
			back ||= b && !this.padPrev.b;
			menu ||= start && !this.padPrev.start;
			run ||= b;
			this.padPrev = { a, b, start, dir: padDir };
		}

		const now = this.scene.time.now;
		let interactHeld = false;
		if (this.interactSince !== null && !this.interactReported && now - this.interactSince >= HOLD_MS) {
			interactHeld = this.interactReported = true;
		}
		const longPresses: FrameInput["longPresses"] = [];
		const p = this.scene.input.activePointer;
		if (p.isDown && !this.pressReported && p.getDuration() >= HOLD_MS && Phaser.Math.Distance.Between(p.downX, p.downY, p.x, p.y) <= TAP_SLOP) {
			this.pressReported = true;
			const world = p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
			longPresses.push({ x: world.x, y: world.y, screenX: p.x, screenY: p.y });
		}

		const taps = this.taps;
		this.taps = [];
		this.interactQueued = this.backQueued = this.menuQueued = false;
		this.dirPressQueue = [];
		return { dir, dirPresses, run, interact, back, menu, taps, interactHeld, longPresses, device: this.device };
	}
}
