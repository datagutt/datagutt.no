// The shapes of lights, as alpha (0..1) at a point, shared by the game (which bakes them
// into textures) and the map review renderer (which composites them), so both agree.

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A round glow: 1 in the middle, 0 at distance 1 (distances are in radii). */
export function glowAlpha(dx: number, dy: number): number {
	return smooth(clamp01(1 - Math.hypot(dx, dy))) ** 1.5;
}

/**
 * Daylight falling from a window onto the floor: a patch leaning right as it drops and
 * fading out. `u`, `v` run 0..1 across and down the patch.
 */
export function beamAlpha(u: number, v: number): number {
	const lean = v * 0.25;
	const edge = Math.min(u - 0.1 - lean * 0.5, 0.75 + lean * 0.5 - u);
	return smooth(clamp01(edge / 0.12)) * smooth(clamp01(1 - v));
}

/** "ffaa66" to [r, g, b]. */
export function hexRgb(hex: string): [number, number, number] {
	const n = parseInt(hex, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
