import type { Facing } from "../world/objects";

/**
 * Tracks held direction keys so the most recently pressed one wins, and releasing it
 * falls back to whichever is still held. Holding right then tapping up walks up and
 * returns to right: what players expect from a keyboard.
 */
export class DirectionStack {
	private held: Facing[] = [];

	press(dir: Facing): void {
		this.release(dir);
		this.held.push(dir);
	}

	release(dir: Facing): void {
		this.held = this.held.filter((d) => d !== dir);
	}

	clear(): void {
		this.held = [];
	}

	get current(): Facing | null {
		return this.held.at(-1) ?? null;
	}
}
