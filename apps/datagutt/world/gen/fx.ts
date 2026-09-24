// Soft shadow tiles, drawn in code rather than cut from LimeZu art, so they exist in
// placeholder builds too. Maps put them on the `shade` layer, which the game multiplies
// (LAYER_BLEND in canvas.ts). Lights are map objects instead (game/fx/Lights.ts).
//
// The "fx" sheet, 10×5 tiles. Row 0: an old free-standing oval (cols 0-2, unused), a
// top-down fade (3), a solid tile (4). Rows 1-2 and 3-4: contact shadows 1 to 4 tiles
// wide (SHADOW_COL), an oval around the object's base (see shadowUnder).
import type { Raw } from "./atlas.ts";

const T = 16;
export const FX_COLS = 10;
export const FX_ROWS = 5;
/** Where the contact shadow `w` tiles wide starts in rows 1-2. */
export const SHADOW_COL = (w: number) => (w * (w - 1)) / 2;

type Rgb = [number, number, number];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function paint(img: Raw, x0: number, y0: number, w: number, h: number, pixel: (x: number, y: number) => [Rgb, number]) {
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const [rgb, a] = pixel(x + 0.5, y + 0.5);
			if (a <= 0) continue;
			const i = ((y0 + y) * img.width + x0 + x) * 4;
			img.data[i] = rgb[0];
			img.data[i + 1] = rgb[1];
			img.data[i + 2] = rgb[2];
			img.data[i + 3] = Math.round(clamp01(a) * 255);
		}
	}
}

let cached: Raw | null = null;

export function fxSheet(): Raw {
	if (cached) return cached;
	const img: Raw = { data: Buffer.alloc(FX_COLS * T * FX_ROWS * T * 4), width: FX_COLS * T, height: FX_ROWS * T };
	// Shade, multiplied: dark bluish tones read as shadow on any floor.
	const shadow: Rgb = [70, 62, 96];
	paint(img, 0, 0, 3 * T, T, (x, y) => {
		const d = Math.hypot((x - 1.5 * T) / (1.5 * T), (y - T / 2) / (T / 2));
		return [shadow, 0.55 * smooth(clamp01(1 - d))];
	});
	paint(img, 3 * T, 0, T, T, (_x, y) => [shadow, 0.6 * smooth(clamp01(1 - y / T))]);
	paint(img, 4 * T, 0, T, T, () => [shadow, 0.5]);
	for (let w = 1; w <= 4; w++) {
		// Wide and flat, mostly hidden under the object and peeking out around its feet.
		// Rows 1-2 for art that reaches the bottom of its tile, rows 3-4 for art that
		// ends halfway down it.
		for (const [row, cy] of [[1, T - 3], [3, T / 2 - 1]]) {
			const rx = (w * T) / 2 - 1;
			const ry = 0.36 * T;
			paint(img, SHADOW_COL(w) * T, row * T, w * T, 2 * T, (x, y) => {
				const d = Math.hypot((x - (w * T) / 2) / rx, (y - cy) / ry);
				return [shadow, 0.5 * smooth(clamp01(1 - d))];
			});
		}
	}
	cached = img;
	return img;
}
