#!/usr/bin/env node
// Which LimeZu singles make up a prefab cut from a sheet? For each named prefab in
// world/art/prefabs.ts or furniture.ts, searches every singles folder for images whose
// pixels appear exactly inside the prefab's rectangle (± 1 tile), since sheets borrow
// objects from other themes. Needs the art.
//
//   node scripts/world/find-single.mjs <prefab name> [...]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PREFABS } from "../../world/art/prefabs.ts";
import { FURNITURE } from "../../world/art/furniture.ts";
import { SHEETS, SINGLES } from "../../world/art/sheets.ts";
import { singleKeys } from "../../world/art/singleKey.ts";
import { DEFAULT_LOCAL_DIR, findRepoRoot } from "../assets/source.mjs";
const A = path.resolve(findRepoRoot(process.cwd()), DEFAULT_LOCAL_DIR, "limezu");
const raw = async (f) => { const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, width: info.width, height: info.height }; };
const all = { ...PREFABS, ...FURNITURE };
const names = process.argv.slice(2);
// Load every single once.
const singles = [];
for (const [sheet, folder] of Object.entries(SINGLES)) {
	const dir = path.join(A, folder);
	for (const [key, file] of singleKeys(fs.readdirSync(dir).filter((f) => f.endsWith(".png")))) {
		const s = await raw(path.join(dir, file));
		let anchor = -1;
		for (let i = 0; i < s.width * s.height; i++) if (s.data[i * 4 + 3] === 255) { anchor = i; break; }
		if (anchor >= 0) singles.push({ id: `${sheet}#${key}`, s, anchor, opaque: s.data.reduce((n, v, i) => (i % 4 === 3 && v > 0 ? n + 1 : n), 0) });
	}
}
const sheets = new Map();
for (const name of names) {
	const p = all[name];
	const base = p.sheet.replace(/^villaRed$/, "villas").replace(/^campingDry$/, "camping");
	if (!sheets.has(base)) sheets.set(base, await raw(path.join(A, SHEETS[base])));
	const sh = sheets.get(base);
	const x0 = Math.max(0, (p.col - 1) * 16), y0 = Math.max(0, (p.row - 1) * 16);
	const x1 = Math.min(sh.width, (p.col + p.w + 1) * 16), y1 = Math.min(sh.height, (p.row + p.h + 1) * 16);
	const byColor = new Map();
	for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
		const i = (y * sh.width + x) * 4;
		if (sh.data[i + 3] !== 255) continue;
		const k = (sh.data[i] << 16) | (sh.data[i + 1] << 8) | sh.data[i + 2];
		(byColor.get(k) ?? byColor.set(k, []).get(k)).push([x, y]);
	}
	const found = [];
	for (const { id, s, anchor, opaque } of singles) {
		const ai = anchor * 4;
		const k = (s.data[ai] << 16) | (s.data[ai + 1] << 8) | s.data[ai + 2];
		for (const [ax, ay] of byColor.get(k) ?? []) {
			const ox = ax - (anchor % s.width), oy = ay - Math.floor(anchor / s.width);
			if (ox < x0 - 16 || oy < y0 - 16 || ox + s.width > x1 + 16 || oy + s.height > y1 + 16) continue;
			let ok = true;
			for (let i = 0; i < s.width * s.height && ok; i++) {
				if (!s.data[i * 4 + 3]) continue;
				const sx = ox + (i % s.width), sy = oy + Math.floor(i / s.width);
				if (sx < 0 || sy < 0 || sx >= sh.width || sy >= sh.height) { ok = false; break; }
				const b = (sy * sh.width + sx) * 4;
				for (let c = 0; c < 4; c++) if (s.data[i * 4 + c] !== sh.data[b + c]) { ok = false; break; }
			}
			if (ok) { found.push(`${id} ${s.width / 16}x${s.height / 16} @px ${ox},${oy} (${opaque}px)`); break; }
		}
	}
	console.log(`${name} (${base} ${p.col},${p.row} ${p.w}x${p.h}): ${found.length ? found.join(" | ") : "none"}`);
}
