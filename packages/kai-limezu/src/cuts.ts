// Checks that prefabs cut from a sheet don't slice a LimeZu object in half: every
// catalogued object that overlaps a prefab's rectangle must lie wholly inside it.
// Singles ("sheet#n") are whole by definition. Runs in world:gen and world:check.
import { catalog } from "./singles.ts";
import { DERIVED } from "./sheets.ts";
import type { Prefab } from "@datagutt/kai-worldgen/canvas";

export function checkCuts(mapId: string, prefabs: Prefab[]): string[] {
	const problems = new Set<string>();
	for (const p of prefabs) {
		if (p.sheet.includes("#") || p.sheet === "fx" || p.allowCut) continue;
		const base = DERIVED[p.sheet]?.from ?? p.sheet;
		const cat = catalog(base);
		// Detected catalogues (sheets without singles) merge objects that touch, so they
		// can't tell a cut from a neighbour: those sheets are checked by eye instead.
		if (!cat || cat.method !== "singles") continue;
		for (const [n, col, row, w, h] of cat.objects) {
			const overlaps = col < p.col + p.w && col + w > p.col && row < p.row + p.h && row + h > p.row;
			const inside = col >= p.col && row >= p.row && col + w <= p.col + p.w && row + h <= p.row + p.h;
			if (!overlaps || inside) continue;
			const fix = cat.method === "singles" ? `use single("${base}", ${JSON.stringify(n)})` : `widen it to ${col},${row} ${w}×${h}`;
			problems.add(`${mapId}: prefab ${p.sheet} ${p.col},${p.row} ${p.w}×${p.h} cuts object ${n} (${col},${row} ${w}×${h}); ${fix}`);
		}
	}
	return [...problems];
}
