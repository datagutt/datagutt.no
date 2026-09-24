// Emote bubbles from LimeZu's thinking-emotes sheet (Modern Interiors UI elements), which
// the asset build copies to ui/emotes.png. The sheet is a 10×10 grid of 16 px frames; each
// bubble is two frames side by side (a gentle two-step animation), and the dotted tail
// that joins a bubble to the head below it is a frame of its own.

export const EMOTE_FRAME = 16;
export const EMOTE_COLUMNS = 10;

/** The first of each bubble's two frames, as [column, row]. */
export const EMOTES = {
	computer: [8, 5],
	music: [6, 6],
	sleep: [6, 5],
	dots: [2, 9],
	exclaim: [0, 4],
	question: [2, 5],
	heart: [4, 2],
} as const satisfies Record<string, readonly [number, number]>;
export type EmoteName = keyof typeof EMOTES;

/** The tail: three dots rising from the head to the bubble. */
export const EMOTE_TAIL = [5, 1] as const;

/** Frame index in the sheet of [column, row]. */
export const emoteFrame = ([col, row]: readonly [number, number]) => row * EMOTE_COLUMNS + col;
