// Packs the registered tiles into the one tileset image the game loads, from the LimeZu
// sheets or, without the private art, from a committed table of tile colours.
import path from "node:path";
import sharp from "sharp";
import { DERIVED, SHEETS, type SheetId } from "../art/sheets.ts";
import { ATLAS_CAPACITY, ATLAS_COLUMNS, parseKey, RESERVED } from "./registry.ts";

const T = 16;
/** Quadrant size for placeholder colour sketches. */
const Q = T / 2;

export type Raw = { data: Buffer; width: number; height: number };

/** Loads LimeZu sheets on demand as raw RGBA. */
export class SheetCache {
	private sheets = new Map<string, Raw>();
	readonly artDir: string;

	constructor(artDir: string) {
		this.artDir = artDir;
	}

	async get(id: string): Promise<Raw> {
		const cached = this.sheets.get(id);
		if (cached) return cached;
		const derived = DERIVED[id];
		const raw = derived ? recolor(await this.get(derived.from), derived.recolor) : await this.load(id);
		this.sheets.set(id, raw);
		return raw;
	}

	private async load(id: string): Promise<Raw> {
		const file = SHEETS[id as SheetId];
		if (!file) throw new Error(`Unknown sheet "${id}"`);
		const { data, info } = await sharp(path.join(this.artDir, "limezu", file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		return { data, width: info.width, height: info.height };
	}
}

function recolor(src: Raw, swaps: Record<string, string>): Raw {
	// Targets are rrggbb (keep alpha) or rrggbbaa.
	const table = new Map(
		Object.entries(swaps).map(([from, to]) => [parseInt(from, 16), [0, 2, 4, 6].map((o) => (to.length > o ? parseInt(to.slice(o, o + 2), 16) : -1))]),
	);
	const data = Buffer.from(src.data);
	for (let i = 0; i < data.length; i += 4) {
		const to = table.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
		if (!to) continue;
		data[i] = to[0];
		data[i + 1] = to[1];
		data[i + 2] = to[2];
		if (to[3] >= 0) data[i + 3] = to[3];
	}
	return { ...src, data };
}

/** Alpha-composite a 16×16 tile from `src` at pixel (sx, sy) into `dst` at (dx, dy). */
export function blitTile(src: Raw, sx: number, sy: number, dst: Raw, dx: number, dy: number) {
	for (let py = 0; py < T; py++) {
		for (let px = 0; px < T; px++) {
			const si = ((sy + py) * src.width + sx + px) * 4;
			const a = src.data[si + 3] / 255;
			if (a === 0) continue;
			const di = ((dy + py) * dst.width + dx + px) * 4;
			for (let c = 0; c < 3; c++) dst.data[di + c] = Math.round(src.data[si + c] * a + dst.data[di + c] * (1 - a));
			dst.data[di + 3] = Math.max(dst.data[di + 3], src.data[si + 3]);
		}
	}
}

function emptyAtlas(): Raw {
	const width = ATLAS_COLUMNS * T;
	const height = (ATLAS_CAPACITY / ATLAS_COLUMNS) * T;
	return { data: Buffer.alloc(width * height * 4), width, height };
}

const slot = (id: number) => [(id % ATLAS_COLUMNS) * T, Math.floor(id / ATLAS_COLUMNS) * T] as const;

/** The reserved collision tiles, so they are visible when editing in Tiled. */
function drawReserved(atlas: Raw) {
	RESERVED.forEach((_, id) => {
		const [ox, oy] = slot(id);
		const rgba = id === 0 ? [230, 40, 40, 140] : [40, 200, 90, 140];
		for (let y = 0; y < T; y++) {
			for (let x = 0; x < T; x++) {
				const edge = x === 0 || y === 0 || x === T - 1 || y === T - 1 || x === y;
				const i = ((oy + y) * atlas.width + ox + x) * 4;
				rgba.forEach((v, c) => (atlas.data[i + c] = c === 3 && edge ? 255 : v));
			}
		}
	});
}

const png = (raw: Raw) => sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();

export async function buildAtlas(tiles: string[], sheets: SheetCache): Promise<Buffer> {
	const atlas = emptyAtlas();
	drawReserved(atlas);
	for (const [id, key] of tiles.entries()) {
		const ref = parseKey(key);
		if (!ref) continue;
		const [ox, oy] = slot(id);
		blitTile(await sheets.get(ref.sheet), ref.col * T, ref.row * T, atlas, ox, oy);
	}
	return png(atlas);
}

/**
 * A coarse colour sketch of each tile: the average colour of each quadrant as
 * `rrggbbaa`, 4 per tile. Committed so placeholder builds show a recognisable, blocky
 * town without LimeZu pixels in the repository (too coarse to be the art itself).
 */
export type TileColors = Record<string, string>;

export async function tileColors(tiles: string[], sheets: SheetCache): Promise<TileColors> {
	const out: TileColors = {};
	for (const key of tiles) {
		const ref = parseKey(key);
		if (!ref) continue;
		const src = await sheets.get(ref.sheet);
		const cells: string[] = [];
		for (let by = 0; by < 2; by++) {
			for (let bx = 0; bx < 2; bx++) {
				let r = 0, g = 0, b = 0, a = 0;
				for (let py = 0; py < Q; py++) {
					for (let px = 0; px < Q; px++) {
						const i = ((ref.row * T + by * Q + py) * src.width + ref.col * T + bx * Q + px) * 4;
						const w = src.data[i + 3];
						r += src.data[i] * w;
						g += src.data[i + 1] * w;
						b += src.data[i + 2] * w;
						a += w;
					}
				}
				const h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
				cells.push(a === 0 ? "00000000" : h(r / a) + h(g / a) + h(b / a) + h(a / (Q * Q)));
			}
		}
		out[key] = cells.join("");
	}
	return out;
}

export async function buildPlaceholderAtlas(tiles: string[], colors: TileColors): Promise<Buffer> {
	const atlas = emptyAtlas();
	drawReserved(atlas);
	for (const [id, key] of tiles.entries()) {
		const sketch = colors[key];
		if (!sketch) continue;
		const [ox, oy] = slot(id);
		for (let cell = 0; cell < 4; cell++) {
			const rgba = [0, 2, 4, 6].map((o) => parseInt(sketch.slice(cell * 8 + o, cell * 8 + o + 2), 16));
			// Mostly-transparent blocks are dropped so sprites keep a crisp-ish outline.
			if (rgba[3] < 96) continue;
			for (let py = 0; py < Q; py++) {
				for (let px = 0; px < Q; px++) {
					const i = ((oy + Math.floor(cell / 2) * Q + py) * atlas.width + ox + (cell % 2) * Q + px) * 4;
					rgba.forEach((v, c) => (atlas.data[i + c] = c === 3 ? 255 : v));
				}
			}
		}
	}
	return png(atlas);
}
