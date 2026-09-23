// The title scene's shapes and colours, shared by the title screen's SVG (TitleArt.tsx)
// and the link-preview image drawn by `pnpm assets` (scripts/assets/og.mjs), so the two
// always show the same fjord. Units are game pixels. Plain TypeScript: the asset build
// imports it from Node.

export const W = 512;
export const H = 288;
/** Where the waterfront image (world/gen/title.ts, 40×10 tiles) starts, and its size. */
export const STRIP = { x: (W - 640) / 2, y: H - 160, w: 640, h: 160 };
/** The mountains stand on this line, hidden behind the forest at the top of the strip. */
export const BASE = STRIP.y + 24;

/** Deeper blue above the 16:9 frame, in wide steps, for tall screens. */
export const HIGH_SKY = ["#2d62cc", "#3369d3", "#3a72da"];
/** The sky from the top of the frame down, 14 units a band. */
export const SKY_BANDS = ["#3f7fe0", "#4a8ae4", "#5696e8", "#62a2ec", "#70aeef", "#7fbaf2", "#8fc6f4", "#a2d1f6", "#b6dcf8", "#cbe7fa"];
export const SKY_BAND_HEIGHT = 14;

export const COLORS = {
	far: "#8ea4c8",
	snow: "#f2f6fb",
	mid: "#6f8eb0",
	near: "#4f7390",
	fjord: "#3f6a86",
	cloud: "#ffffff",
	cloudShade: "#d6e8f7",
	sun: "#fff1a8",
	halo: "#fff6c9",
};

/** Deterministic smooth noise, so every render of the scene is the same. */
export function ridge(seed: number, x: number, freq: number): number {
	const f = x * freq + seed * 17.13;
	const i = Math.floor(f);
	const t = f - i;
	const hash = (n: number) => {
		const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
		return s - Math.floor(s);
	};
	const smooth = t * t * (3 - 2 * t);
	return hash(i) * (1 - smooth) + hash(i + 1) * smooth;
}

/** Top of each layer at column x (rounded when drawn); the layers fill down to BASE. */
export const farHeight = (x: number) => BASE - 70 - ridge(1, x, 0.03) * 34 - ridge(2, x, 0.1) * 9;
/** Snow covers the far peaks from their top down to this ragged line. */
export const snowline = (x: number) => BASE - 84 + ridge(4, x, 0.3) * 6;
export const midHeight = (x: number) => BASE - 30 - ridge(5, x, 0.045) * 26 - ridge(6, x, 0.15) * 5;
/** The fjord's walls: steep at the sides, falling away towards the water in the middle. */
export function nearHeight(x: number): number {
	const edge = Math.min(Math.abs(x), Math.abs(W - x)) / (W / 2);
	const wall = edge < 0.45 ? ((0.45 - edge) / 0.45) ** 0.8 * 92 : 0;
	return BASE - 12 - wall - ridge(3, x, 0.07) * 10;
}
/** The strip of fjord water just above the forest. */
export const FJORD = { y: BASE - 14, h: 20 };

/** The sun: a pixel disc (three overlapping rectangles) inside a fainter halo. */
export const SUN = {
	halo: [
		{ x: 406, y: 20, w: 32, h: 40 },
		{ x: 402, y: 24, w: 40, h: 32 },
	],
	disc: [
		{ x: 410, y: 28, w: 24, h: 24 },
		{ x: 414, y: 24, w: 16, h: 32 },
		{ x: 406, y: 32, w: 32, h: 16 },
	],
};

/** Pixel clouds: rows of [x offset, width], 3 units tall each, stacked from the top. */
export const CLOUD_SHAPES: [number, number][][] = [
	[[6, 8], [2, 18], [0, 26], [3, 20]],
	[[4, 6], [10, 8], [1, 22], [0, 30], [4, 22]],
	[[3, 10], [0, 16], [2, 12]],
];
export const CLOUD_ROW = 3;
export const CLOUDS = [
	{ x: 60, y: -110, shape: 1, layer: "far" },
	{ x: 330, y: -70, shape: 0, layer: "far" },
	{ x: 200, y: -30, shape: 2, layer: "near" },
	{ x: 30, y: 26, shape: 0, layer: "far" },
	{ x: 150, y: 48, shape: 2, layer: "far" },
	{ x: 300, y: 18, shape: 1, layer: "far" },
	{ x: 420, y: 56, shape: 2, layer: "far" },
	{ x: 90, y: 70, shape: 1, layer: "near" },
	{ x: 260, y: 84, shape: 0, layer: "near" },
	{ x: 400, y: 100, shape: 2, layer: "near" },
] as const;
