// Packs the registered tiles into the one tileset image the game loads, from the LimeZu
// sheets or, without the private art, from a committed table of tile colours.
import path from "node:path";
import sharp from "sharp";
import fs from "node:fs";
import type { ChangedSeason } from "../../game/world/season.ts";
import { paintSnowCaps, seasonalColor } from "../art/seasons.ts";
import { DERIVED, SHEETS, SINGLES, type SheetId } from "../art/sheets.ts";
import { singleKeys } from "../art/singleKey.ts";
import { FLIP } from "./canvas.ts";
import { fxSheet } from "./fx.ts";
import { ATLAS_CAPACITY, ATLAS_COLUMNS, keyParts, RESERVED } from "./registry.ts";

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
		if (id === "fx") return fxSheet();
		const seasonal = /^([^@#]+)@([a-z]+)(#.+)?$/.exec(id);
		if (seasonal) {
			// "villas@winter#Villa_1": that single in winter, recoloured, then any hand-drawn
			// overrides pasted over it.
			const base = seasonal[1] + (seasonal[3] ?? "");
			const season = seasonal[2] as ChangedSeason;
			const raw = await this.applyOverrides(seasonRecolor(await this.get(base), base, season), base, season);
			this.sheets.set(id, raw);
			return raw;
		}
		if (id.includes("#")) {
			// A single, possibly of a recoloured sheet ("villaRed#Villa_5").
			const [sheet, key] = id.split("#");
			const derived = DERIVED[sheet];
			const raw = derived ? recolor(await this.get(`${derived.from}#${key}`), derived.recolor) : await this.loadSingle(id);
			this.sheets.set(id, raw);
			return raw;
		}
		const derived = DERIVED[id];
		const raw = derived ? recolor(await this.get(derived.from), derived.recolor) : await this.load(id);
		this.sheets.set(id, raw);
		return raw;
	}

	/**
	 * Hand-drawn seasonal art in datagutt-assets `seasons/<season>/`: "<single>.png"
	 * (e.g. "villas#Villa_1.png") replaces that single, "<sheet>@<col>,<row>.png" is
	 * pasted over the sheet with its top-left corner at that tile.
	 */
	private async applyOverrides(raw: Raw, base: string, season: ChangedSeason): Promise<Raw> {
		const dir = path.join(this.artDir, SEASON_OVERRIDES, season);
		if (!fs.existsSync(dir)) return raw;
		const out = { ...raw, data: Buffer.from(raw.data) };
		for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".png"))) {
			const name = file.slice(0, -4);
			const patch = name === base ? { col: 0, row: 0 } : parseOverridePatch(name, base);
			if (!patch) continue;
			const { data, info } = await sharp(path.join(dir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
			const [x0, y0] = [patch.col * T, patch.row * T];
			if (name === base && (info.width !== raw.width || info.height !== raw.height)) {
				throw new Error(`${SEASON_OVERRIDES}/${season}/${file} is ${info.width}×${info.height}, but ${base} is ${raw.width}×${raw.height}`);
			}
			if (x0 + info.width > raw.width || y0 + info.height > raw.height) throw new Error(`${SEASON_OVERRIDES}/${season}/${file} reaches past ${base}`);
			for (let y = 0; y < info.height; y++) data.copy(out.data, ((y0 + y) * raw.width + x0) * 4, y * info.width * 4, (y + 1) * info.width * 4);
		}
		return out;
	}

	private singleFiles = new Map<string, Map<string, string>>();

	/** "living#100": single 100 of the living room sheet, as its own image. */
	private async loadSingle(id: string): Promise<Raw> {
		const [sheet, key] = id.split("#");
		const folder = SINGLES[sheet as SheetId];
		if (!folder) throw new Error(`Sheet "${sheet}" has no singles (in "${id}")`);
		const dir = path.join(this.artDir, "limezu", folder);
		let files = this.singleFiles.get(sheet);
		if (!files) {
			files = singleKeys(fs.readdirSync(dir).filter((f) => f.endsWith(".png")));
			this.singleFiles.set(sheet, files);
		}
		const file = files.get(key);
		if (!file) throw new Error(`No single "${key}" for sheet "${sheet}"`);
		const { data, info } = await sharp(path.join(dir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		return { data, width: info.width, height: info.height };
	}

	private async load(id: string): Promise<Raw> {
		const file = SHEETS[id as SheetId];
		if (!file) throw new Error(`Unknown sheet "${id}"`);
		const { data, info } = await sharp(path.join(this.artDir, "limezu", file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		return { data, width: info.width, height: info.height };
	}
}

/** Hand-drawn seasonal art, relative to the datagutt-assets checkout. */
export const SEASON_OVERRIDES = "seasons";

/** "houses@16,250" → where that patch of `sheet` goes; null for other sheets. */
export function parseOverridePatch(name: string, sheet: string): { col: number; row: number } | null {
	const m = /^(.+)@(\d+),(\d+)$/.exec(name);
	return m && m[1] === sheet ? { col: Number(m[2]), row: Number(m[3]) } : null;
}

/** A sheet in another season: snow caps on its roofs in winter, then its greens. */
export function seasonRecolor(src: Raw, sheet: string, season: ChangedSeason, caps = true): Raw {
	const out = { ...src, data: Buffer.from(src.data) };
	if (season === "winter" && caps) paintSnowCaps(out, sheet);
	const { data } = out;
	const memo = new Map<number, [number, number, number] | null>();
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] === 0) continue;
		const c = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		let to = memo.get(c);
		if (to === undefined) memo.set(c, (to = seasonalColor([data[i], data[i + 1], data[i + 2]], sheet, season)));
		if (to) [data[i], data[i + 1], data[i + 2]] = to;
	}
	return out;
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

/**
 * Alpha-composite a 16×16 tile from `src` at pixel (sx, sy) into `dst` at (dx, dy).
 * `flip` uses Tiled's order: transpose (D), then mirror horizontally (H), then vertically (V).
 */
export function blitTile(src: Raw, sx: number, sy: number, dst: Raw, dx: number, dy: number, flip = 0, blend: "normal" | "multiply" | "add" = "normal") {
	for (let py = 0; py < T; py++) {
		for (let px = 0; px < T; px++) {
			// Undo the transform to find the source pixel for this destination pixel.
			let ux = px;
			let uy = py;
			if (flip & FLIP.V) uy = T - 1 - uy;
			if (flip & FLIP.H) ux = T - 1 - ux;
			if (flip & FLIP.D) [ux, uy] = [uy, ux];
			const si = ((sy + uy) * src.width + sx + ux) * 4;
			const a = src.data[si + 3] / 255;
			if (a === 0) continue;
			const di = ((dy + py) * dst.width + dx + px) * 4;
			for (let c = 0; c < 3; c++) {
				const s = src.data[si + c];
				const d = dst.data[di + c];
				const mixed = blend === "multiply" ? (s * d) / 255 : blend === "add" ? Math.min(255, d + s) : s;
				dst.data[di + c] = Math.round(mixed * a + d * (1 - a));
			}
			if (blend === "normal") dst.data[di + 3] = Math.max(dst.data[di + 3], src.data[si + 3]);
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

/** Draw a registry key's tile (all its stacked parts, with their flips) at (dx, dy). */
export async function drawKey(key: string, sheets: SheetCache, dst: Raw, dx: number, dy: number, flip = 0, blend: "normal" | "multiply" | "add" = "normal") {
	for (const part of keyParts(key) ?? []) {
		// A stacked tile's own flip is always 0; a plain tile's comes from its gid.
		blitTile(await sheets.get(part.sheet), part.col * T, part.row * T, dst, dx, dy, part.flip || flip, blend);
	}
}

export async function buildAtlas(tiles: string[], sheets: SheetCache): Promise<Buffer> {
	const atlas = emptyAtlas();
	drawReserved(atlas);
	for (const [id, key] of tiles.entries()) {
		if (key.startsWith("@")) continue;
		const [ox, oy] = slot(id);
		await drawKey(key, sheets, atlas, ox, oy);
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
		const parts = keyParts(key);
		if (!parts || (parts.length === 1 && parts[0].sheet === "fx")) continue;
		// Compose the tile (stacks included) and sketch that.
		const src: Raw = { data: Buffer.alloc(T * T * 4), width: T, height: T };
		await drawKey(key, sheets, src, 0, 0);
		const ref = { col: 0, row: 0 };
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
		const [ox, oy] = slot(id);
		const parts = keyParts(key);
		// Light and shade tiles are generated, not LimeZu art: draw them for real.
		if (parts?.length === 1 && parts[0].sheet === "fx") {
			blitTile(fxSheet(), parts[0].col * T, parts[0].row * T, atlas, ox, oy);
			continue;
		}
		const sketch = colors[key];
		if (!sketch) continue;
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
