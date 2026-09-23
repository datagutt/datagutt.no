// Drafts of fully snowed roofs, the starting point for hand-drawn winter overrides
// (scripts/world/snow-drafts.mjs writes them into datagutt-assets `seasons/winter/` for
// cleaning up in Aseprite). The game never runs this; roofs without an override get the
// automatic snow cap (paintSnowCaps).
import { isDark, roofLightness, roofMask, roofSnow, type Img } from "../art/seasons.ts";

type Polygon = [number, number][];

const rect = (col: number, row: number, w: number, h: number): Polygon => [
	[col, row],
	[col + w, row],
	[col + w, row + h],
	[col, row + h],
];

/**
 * Walls right under a roof in the roof's own colours, which the sky scan can't tell
 * apart: polygons in tile units of the sheet (or single) that never get snow.
 */
const NO_SNOW: Record<string, Polygon[]> = {
	houses: [
		// Boathouse: the gable's siding in the V under the ridge, and the side annexes.
		[[23.6, 256.45], [18.1, 258.6], [18.1, 264], [29, 264], [29, 258.6]],
		rect(16, 254, 2.1, 10),
		rect(29, 254, 2, 10),
		// Farmhouse: the two gable walls under the roofs, and the garage storey.
		[[7.8, 256.3], [5, 258.2], [5, 264], [16, 264], [16, 260.5]],
		[[4.9, 259], [0.8, 261], [0.8, 264], [9, 264], [9, 261.2]],
		rect(0, 261, 16, 3),
		// Office: the lower storey and the stairwell siding.
		rect(0, 94, 5, 5),
		rect(5, 93, 5, 6),
	],
};

/** Whether (x, y) is inside a polygon (even-odd rule). */
function inside(poly: Polygon, x: number, y: number): boolean {
	let hit = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i];
		const [xj, yj] = poly[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
	}
	return hit;
}

/**
 * The whole roof: the sky scan, spread sideways into strips a chimney hid, flecks of moss
 * and rust filled in, and the known walls cut out again.
 */
export function fullRoofMask(img: Img, sheet: string): Uint8Array | null {
	const mask = roofMask(img, sheet);
	if (!mask) return null;
	const { data, width, height } = img;
	const opaque = (p: number) => data[p * 4 + 3] >= 128;
	const REACH = 40;
	const seeded = mask.slice();
	const colours = mask.slice();
	for (let y = 0; y < height; y++) {
		for (const dir of [1, -1]) {
			let from = -Infinity;
			for (let k = 0; k < width; k++) {
				const p = y * width + (dir === 1 ? k : width - 1 - k);
				if (seeded[p]) from = k;
				else if (!opaque(p) || !sameColourAsRoof(img, p, colours)) from = -Infinity;
				else if (k - from <= REACH) mask[p] = 1;
			}
		}
	}
	// Flecks: pixels with roof close by on all four sides (walls have none below them).
	const FLECK = 6;
	const before = mask.slice();
	const near = (x: number, y: number, dx: number, dy: number) => {
		for (let k = 1; k <= FLECK; k++) {
			const [nx, ny] = [x + dx * k, y + dy * k];
			if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
			if (before[ny * width + nx]) return true;
		}
		return false;
	};
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const p = y * width + x;
			if (before[p] || !opaque(p)) continue;
			if (near(x, y, -1, 0) && near(x, y, 1, 0) && near(x, y, 0, -1) && near(x, y, 0, 1)) mask[p] = 1;
		}
	}
	for (const poly of NO_SNOW[sheet] ?? []) {
		const xs = poly.map(([x]) => x * 16);
		const ys = poly.map(([, y]) => y * 16);
		for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(height, Math.ceil(Math.max(...ys))); y++) {
			for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(width, Math.ceil(Math.max(...xs))); x++) {
				if (inside(poly, (x + 0.5) / 16, (y + 0.5) / 16)) mask[y * width + x] = 0;
			}
		}
	}
	return mask;
}

/** Whether pixel p has a colour some pixel of the (scanned) roof has. */
function sameColourAsRoof(img: Img, p: number, roof: Uint8Array): boolean {
	const key = (q: number) => (img.data[q * 4] << 16) | (img.data[q * 4 + 1] << 8) | img.data[q * 4 + 2];
	let set = roofColours.get(roof);
	if (!set) {
		set = new Set<number>();
		roof.forEach((m, q) => m && set!.add(key(q)));
		roofColours.set(roof, set);
	}
	return set.has(key(p));
}
const roofColours = new WeakMap<Uint8Array, Set<number>>();

const SHADE = [0x74, 0x82, 0xab] as const;

/**
 * Snow over the whole roof, in place. Each pixel takes the snow shade that matches how
 * light the roof was there, so slopes, ridges and shingle rows still read; the silhouette
 * outline stays; the top row catches the light; a lip of snow hangs over each eave and
 * casts a shade on the wall below.
 */
export function paintSnowRoof(img: Img, sheet: string, mask: Uint8Array): void {
	const { data, width, height } = img;
	const light = roofLightness(sheet);
	const rgb = (i: number): [number, number, number] => [data[i], data[i + 1], data[i + 2]];
	const at = (x: number, y: number) => (y * width + x) * 4;
	const transparent = (x: number, y: number) => x < 0 || y < 0 || x >= width || y >= height || data[at(x, y) + 3] < 128;
	const inMask = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
	const src = Uint8Array.from(data);
	const srcLight = (x: number, y: number) => light([src[at(x, y)], src[at(x, y) + 1], src[at(x, y) + 2]]);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (!inMask(x, y)) continue;
			const i = at(x, y);
			// Keep the silhouette: outline pixels on the roof's edge against the sky.
			const edge = transparent(x - 1, y) || transparent(x + 1, y) || transparent(x, y - 1);
			if (isDark(src, i) && edge) continue;
			const top = !inMask(x, y - 1);
			const t = isDark(src, i) ? 0 : srcLight(x, y);
			[data[i], data[i + 1], data[i + 2]] = roofSnow(t, top ? 1 : 0);
		}
	}
	// Eaves: a lip of snow over the edge, and its shade under it.
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height - 1; y++) {
			if (!inMask(x, y) || inMask(x, y + 1) || transparent(x, y + 1)) continue;
			const lip = at(x, y + 1);
			if (isDark(src, lip)) {
				[data[lip], data[lip + 1], data[lip + 2]] = roofSnow(0.4, 1);
				const below = at(x, y + 2);
				if (y + 2 < height && !transparent(x, y + 2) && !inMask(x, y + 2)) {
					const c = rgb(below);
					[data[below], data[below + 1], data[below + 2]] = c.map((v, k) => Math.round(v + (SHADE[k] - v) * 0.45)) as [number, number, number];
				}
			}
		}
	}
}
