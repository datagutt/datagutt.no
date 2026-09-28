import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { ChangedSeason } from "@datagutt/kai/world/season";
import { recolor, type Raw, type SheetSource } from "@datagutt/kai-worldgen/atlas";
import { paintSnowCaps, seasonalColor } from "./seasons.ts";
import { DERIVED, SHEETS, SINGLES, type SheetId } from "./sheets.ts";
import { singleKeys } from "./singleKey.ts";

const T = 16;

/**
 * Loads LimeZu sheets on demand as raw RGBA, from a checkout of the art repository:
 * sheets and singles under `limezu/`, recoloured (derived) sheets, and seasonal sheets
 * with the game's hand-drawn overrides pasted over them.
 */
export class LimeZuSheets implements SheetSource {
	private sheets = new Map<string, Raw>();
	readonly artDir: string;
	/** The game's hand-drawn seasonal art, relative to `artDir` (`<dir>/<season>/*.png`). */
	readonly overridesDir: string | null;

	constructor(artDir: string, options: { overridesDir?: string } = {}) {
		this.artDir = artDir;
		this.overridesDir = options.overridesDir ?? null;
	}

	async get(id: string): Promise<Raw> {
		const cached = this.sheets.get(id);
		if (cached) return cached;
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
	 * Hand-drawn seasonal art in `<overridesDir>/<season>/`: "<single>.png" (e.g.
	 * "villas#Villa_1.png") replaces that single, "<sheet>@<col>,<row>.png" is pasted over
	 * the sheet with its top-left corner at that tile.
	 */
	private async applyOverrides(raw: Raw, base: string, season: ChangedSeason): Promise<Raw> {
		if (!this.overridesDir) return raw;
		const where = path.join(this.overridesDir, season);
		const dir = path.join(this.artDir, where);
		if (!fs.existsSync(dir)) return raw;
		const out = { ...raw, data: Buffer.from(raw.data) };
		for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".png"))) {
			const name = file.slice(0, -4);
			const patch = name === base ? { col: 0, row: 0 } : parseOverridePatch(name, base);
			if (!patch) continue;
			const { data, info } = await sharp(path.join(dir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
			const [x0, y0] = [patch.col * T, patch.row * T];
			if (name === base && (info.width !== raw.width || info.height !== raw.height)) {
				throw new Error(`${where}/${file} is ${info.width}×${info.height}, but ${base} is ${raw.width}×${raw.height}`);
			}
			if (x0 + info.width > raw.width || y0 + info.height > raw.height) throw new Error(`${where}/${file} reaches past ${base}`);
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

