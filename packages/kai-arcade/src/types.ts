// Arcade cabinet games: datagutt.no's old five canvases, rebuilt as small games that draw
// onto one low-resolution screen. Nothing here knows about Phaser; the runtime's arcade
// screen shows a cabinet and feeds it input.

/** Every cabinet draws on a screen this size, in game pixels, scaled up whole. */
export const SCREEN_W = 160;
export const SCREEN_H = 120;

export type Direction = "left" | "right" | "up" | "down";

export type ArcadeInput = {
	/** Directions held this frame. */
	held: ReadonlySet<Direction>;
	/** Directions pressed this frame (first frame down only). */
	pressed: ReadonlySet<Direction>;
	/** The interact button (A) pressed this frame. */
	a: boolean;
};

export const NO_INPUT: ArcadeInput = { held: new Set(), pressed: new Set(), a: false };

export interface ArcadeGame {
	/** Shown on the cabinet's marquee. */
	readonly title: string;
	/** One line under the screen: what the buttons do. */
	readonly hint: string;
	step(dtMs: number, input: ArcadeInput): void;
	draw(ctx: CanvasRenderingContext2D): void;
}

/** The old site's greens, darkest first (primary-950 to primary-200). */
export const GREENS = ["#042f1c", "#125536", "#14673e", "#12834b", "#1dc672", "#46e294", "#83f2ba", "#b9f9d9"];
export const SCREEN_BG = "#020f09";

/** A small deterministic random source, so a cabinet can be replayed in tests. */
export function rng(seed: number): () => number {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) / 4294967296;
	};
}
