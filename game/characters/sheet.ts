// Frame layout of a LimeZu character sheet (16x16 pack): 16×32 frames, 56 per row,
// directions always in the order right, up, left, down. The build keeps rows 0..6.

export const FRAME_WIDTH = 16;
export const FRAME_HEIGHT = 32;
export const SHEET_COLUMNS = 56;
/** Rows copied into our built sheets: stand, idle, walk, sleep, sit, sit, phone. */
export const SHEET_ROWS = 7;

export const DIRECTIONS = ["right", "up", "left", "down"] as const;
export type Direction = (typeof DIRECTIONS)[number];

type AnimSpec = { row: number; framesPerDirection: number; frameRate: number; repeat: number };

export const ANIMS = {
	stand: { row: 0, framesPerDirection: 1, frameRate: 1, repeat: 0 },
	idle: { row: 1, framesPerDirection: 6, frameRate: 6, repeat: -1 },
	walk: { row: 2, framesPerDirection: 6, frameRate: 12, repeat: -1 },
	phone: { row: 6, framesPerDirection: 3, frameRate: 4, repeat: -1 },
} satisfies Record<string, AnimSpec>;
export type AnimName = keyof typeof ANIMS;

/** Frame indices for one animation facing one direction. */
export function animFrames(anim: AnimName, dir: Direction): number[] {
	const spec = ANIMS[anim];
	const start = spec.row * SHEET_COLUMNS + DIRECTIONS.indexOf(dir) * spec.framesPerDirection;
	return Array.from({ length: spec.framesPerDirection }, (_, i) => start + i);
}

/** Animation key, unique per character, animation and direction. */
export function animKey(character: string, anim: AnimName, dir: Direction): string {
	return `${character}:${anim}:${dir}`;
}
