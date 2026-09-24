// Prefabs from LimeZu "singles": whole objects as LimeZu cut them, including ones that
// are assembled from parts laid out separately in their sheet. Sizes come from the
// committed catalogue (world/art/catalog/, built by `bun run world:catalog`), so maps
// generate without the art. Browse world/out/catalog/<sheet>-singles.png to pick numbers.
import fs from "node:fs";
import type { LayerName, Prefab } from "../gen/canvas.ts";
import { DERIVED, type SheetId } from "./sheets.ts";

type SingleRow = [key: string, w: number, h: number, col: number | null, row: number | null, coverage?: string];
type ObjectRow = [key: string | number, col: number, row: number, w: number, h: number];
export type Catalog = { sheet: string; method: "singles" | "detected"; objects: ObjectRow[]; singles?: SingleRow[]; coverage?: string[] };

/** Coverage of a rectangle cut from a sheet, in the same format as a single's. */
export function sheetCoverage(sheet: string, col: number, row: number, w: number, h: number): string | undefined {
	const rows = catalog(DERIVED[sheet]?.from ?? sheet)?.coverage;
	if (!rows) return undefined;
	return Array.from({ length: h }, (_, dy) => (rows[row + dy] ?? "").slice(col, col + w).padEnd(w, ".")).join("/");
}

const cache = new Map<string, Catalog | null>();

export function catalog(sheet: string): Catalog | null {
	if (!cache.has(sheet)) {
		const url = new URL(`./catalog/${sheet}.json`, import.meta.url);
		cache.set(sheet, fs.existsSync(url) ? (JSON.parse(fs.readFileSync(url, "utf8")) as Catalog) : null);
	}
	return cache.get(sheet)!;
}

export type SingleOptions = {
	/** Top rows that draw over characters. */
	aboveRows?: number;
	/**
	 * For tall things standing on the floor (a treadmill, a lamp, a tree): only the bottom
	 * `base` rows block; the rows above draw over characters walking behind.
	 */
	base?: number;
	/** Rows of "#" (blocked) and "." from the bottom up; default: everything below aboveRows. */
	collision?: string[];
	flat?: boolean;
	door?: [number, number];
	rowLayers?: LayerName[];
};

/**
 * A prefab that is LimeZu single `key` of `sheet`, whole: its number ("12" or 12) or,
 * for exterior singles, its name ("Country_House").
 */
export function single(sheet: SheetId | keyof typeof DERIVED, key: string | number, options: SingleOptions = {}): Prefab {
	const baseSheet = DERIVED[sheet]?.from ?? sheet;
	const row = catalog(baseSheet)?.singles?.find((s) => s[0] === String(key));
	if (!row) throw new Error(`Single ${sheet}#${key} is not in the catalogue (world/art/catalog/${sheet}.json)`);
	const [, w, h, , , coverage] = row;
	const { base, ...rest } = options;
	const aboveRows = base !== undefined ? Math.max(0, h - base) : (options.aboveRows ?? 0);
	return { sheet: `${sheet}#${key}`, col: 0, row: 0, w, h, coverage, ...rest, aboveRows };
}

/** A single that lies flat (rugs, mats): drawn under everything, walkable. */
export const flatSingle = (sheet: SheetId | keyof typeof DERIVED, key: string | number) => single(sheet, key, { flat: true, collision: [] });

/** An object assembled from parts (LimeZu's modular sofas and counters), top-left first. */
export function assemble(parts: { prefab: Prefab; dx: number; dy: number }[]): Prefab {
	const w = Math.max(...parts.map((p) => p.dx + p.prefab.w));
	const h = Math.max(...parts.map((p) => p.dy + p.prefab.h));
	return { sheet: "parts", col: 0, row: 0, w, h, aboveRows: 0, parts };
}
