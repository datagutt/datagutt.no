// Soft shadow tiles, drawn in code rather than cut from LimeZu art, so they exist in
// placeholder builds too. Maps put them on the `shade` layer, which the game multiplies
// (LAYER_BLEND in canvas.ts). Lights are map objects instead (game/fx/Lights.ts).
//
// The "fx" sheet, 8×1 tiles: an oval blob (cols 0-2), a top-down fade (3), a solid tile (4).
import type { Raw } from "./atlas.ts";

const T = 16;
export const FX_COLS = 8;
export const FX_ROWS = 1;

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
	cached = img;
	return img;
}
