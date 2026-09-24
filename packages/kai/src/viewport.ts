// How big the low-resolution game canvas is and how far the browser scales it up.
// The canvas is scaled by a whole number of *device* pixels, so every game pixel is
// an exact square on screen whatever the devicePixelRatio (docs/game/DESIGN.md §13).
import { TILE } from "./constants.ts";

/** Never show fewer tiles than this on the short screen axis. */
export const MIN_SHORT_TILES = 11;

/** How many tiles we aim to show on the short axis: fewer on phones so sprites stay big. */
export function targetShortTiles(shortCssPx: number): number {
	return shortCssPx < 600 ? 12 : 17;
}

export type Viewport = {
	/** Integer device pixels per game pixel. */
	zoom: number;
	/** Game canvas size in game pixels. */
	width: number;
	height: number;
	/** CSS size of the canvas, which may overhang the screen by less than one game pixel. */
	cssWidth: number;
	cssHeight: number;
};

export function computeViewport(cssWidth: number, cssHeight: number, dpr: number): Viewport {
	const deviceWidth = Math.round(cssWidth * dpr);
	const deviceHeight = Math.round(cssHeight * dpr);
	const shortDevice = Math.min(deviceWidth, deviceHeight);
	const shortCss = Math.min(cssWidth, cssHeight);

	let zoom = Math.max(1, Math.round(shortDevice / (targetShortTiles(shortCss) * TILE)));
	// Too zoomed in to show the minimum: back off to the largest zoom that still fits it.
	if (shortDevice / zoom < MIN_SHORT_TILES * TILE) {
		zoom = Math.max(1, Math.floor(shortDevice / (MIN_SHORT_TILES * TILE)));
	}

	// Round up so the canvas always covers the screen; the overhang is clipped.
	const width = Math.ceil(deviceWidth / zoom);
	const height = Math.ceil(deviceHeight / zoom);
	return {
		zoom,
		width,
		height,
		cssWidth: (width * zoom) / dpr,
		cssHeight: (height * zoom) / dpr,
	};
}
