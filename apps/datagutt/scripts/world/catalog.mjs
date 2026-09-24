#!/usr/bin/env node
// Builds the sprite catalogue (world/art/catalog/<sheet>.json), metadata only (no
// pixels, so it is committed): the whole objects of each LimeZu sheet. Needs the art.
//
// Sheets with a "Singles" folder: LimeZu's singles are the finished objects, and some are
// assembled from parts laid out separately in the sheet, so maps use the singles
// themselves (world/art/singles.ts). The catalogue records each single's size in tiles
// and, when its pixels appear as-is in the sheet, its tile position there (the validator
// uses that to catch prefabs cut from the sheet that slice an object in half).
// Sheets without singles (AUTO_CATALOG) get objects detected from their pixels, with
// touching pixels grouped (8-connected).
//
// Also writes world/out/catalog/: <sheet>.png (the sheet with objects boxed and
// numbered) and <sheet>-singles.png (every single, numbered), for picking by eye.
//
//   node scripts/world/catalog.mjs [--only=<sheet>]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { AUTO_CATALOG, SHEETS, SINGLES } from "../../world/art/sheets.ts";
import { singleKeys } from "../../world/art/singleKey.ts";
import { resolveAssetSource } from "../assets/source.mjs";

const T = 16;
const root = process.cwd();
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const source = resolveAssetSource({
	env: { ...process.env, ASSETS_REPO_TOKEN: undefined },
	cwd: root,
	isAssetsDir: (dir) => fs.existsSync(path.join(dir, "limezu")),
});
if (!source.dir) {
	console.error("[catalog] Needs the art checkout (../datagutt-assets).");
	process.exit(1);
}
const art = (p) => path.join(source.dir, "limezu", p);
const outJson = path.join(root, "world/art/catalog");
const outPng = path.join(root, "world/out/catalog");
fs.mkdirSync(outJson, { recursive: true });
fs.mkdirSync(outPng, { recursive: true });

const raw = async (file) => {
	const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height };
};

/** Where `single` sits in `sheet`: every opaque pixel must match exactly. */
function locate(sheet, single) {
	const opaque = [];
	for (let i = 0; i < single.width * single.height; i++) if (single.data[i * 4 + 3] > 0) opaque.push(i);
	if (!opaque.length) return null;
	const fits = (ox, oy) => {
		for (const i of opaque) {
			const sx = ox + (i % single.width);
			const sy = oy + Math.floor(i / single.width);
			const a = i * 4;
			const b = (sy * sheet.width + sx) * 4;
			if (single.data[a] !== sheet.data[b] || single.data[a + 1] !== sheet.data[b + 1] || single.data[a + 2] !== sheet.data[b + 2] || single.data[a + 3] !== sheet.data[b + 3]) return false;
		}
		return true;
	};
	// Usually on the tile grid; a few sit off it, so fall back to every pixel offset.
	for (const step of [T, 1]) {
		for (let oy = 0; oy + single.height <= sheet.height; oy += step) {
			for (let ox = 0; ox + single.width <= sheet.width; ox += step) if (fits(ox, oy)) return { x: ox, y: oy };
		}
	}
	return null;
}

/** The opaque part of a single placed at `at`, in sheet pixels. */
function opaqueBox(single, at) {
	let x0 = single.width, y0 = single.height, x1 = -1, y1 = -1;
	for (let y = 0; y < single.height; y++) {
		for (let x = 0; x < single.width; x++) {
			if (single.data[(y * single.width + x) * 4 + 3] === 0) continue;
			x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
		}
	}
	return { x: at.x + x0, y: at.y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Sprites found from the pixels: opaque regions, merged across gaps up to `gap` px. */
function detect(sheet, gap = 0) {
	const { width: W, height: H } = sheet;
	const on = new Uint8Array(W * H);
	for (let i = 0; i < W * H; i++) if (sheet.data[i * 4 + 3] > 0) on[i] = 1;
	const seen = new Uint8Array(W * H);
	const boxes = [];
	for (let start = 0; start < W * H; start++) {
		if (!on[start] || seen[start]) continue;
		let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
		const stack = [start];
		seen[start] = 1;
		while (stack.length) {
			const i = stack.pop();
			const x = i % W;
			const y = (i / W) | 0;
			n++;
			x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
			for (let dy = -gap - 1; dy <= gap + 1; dy++) {
				for (let dx = -gap - 1; dx <= gap + 1; dx++) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
					const j = ny * W + nx;
					if (on[j] && !seen[j]) {
						seen[j] = 1;
						stack.push(j);
					}
				}
			}
		}
		if (n >= 24) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
	}
	return boxes;
}

/**
 * How much of each 16×16 tile is filled, as one character per tile: "#" at least a
 * quarter near-opaque (solid enough to walk into; shadows don't count), "+" a little,
 * "." empty. Rows joined with
 * "/". Metadata only; default collision is derived from it (world/art/singles.ts).
 */
function coverage(img, x0 = 0, y0 = 0, w = img.width, h = img.height) {
	const rows = [];
	for (let ty = 0; ty < h / T; ty++) {
		let line = "";
		for (let tx = 0; tx < w / T; tx++) {
			let n = 0;
			for (let py = 0; py < T; py++) {
				for (let px = 0; px < T; px++) {
					const x = x0 + tx * T + px;
					const y = y0 + ty * T + py;
					// Only near-opaque pixels count: LimeZu's baked drop shadows are translucent
					// and must not block the ground they fall on.
					if (x < img.width && y < img.height && img.data[(y * img.width + x) * 4 + 3] >= SOLID_ALPHA) n++;
				}
			}
			line += n >= (T * T) / 4 ? "#" : n > 0 ? "+" : ".";
		}
		rows.push(line);
	}
	return rows.join("/");
}

/** Alpha from which a pixel is part of the object rather than its shadow. */
const SOLID_ALPHA = 200;

const toTiles = (b) => {
	const col = Math.floor(b.x / T);
	const row = Math.floor(b.y / T);
	return [col, row, Math.floor((b.x + b.w - 1) / T) - col + 1, Math.floor((b.y + b.h - 1) / T) - row + 1];
};

async function contactSheet(id, sheet, items) {
	const scale = 2;
	let svg = `<svg width="${sheet.width * scale}" height="${sheet.height * scale}" xmlns="http://www.w3.org/2000/svg" font-family="monospace" font-size="11">`;
	for (const [n, col, row, w, h] of items) {
		svg += `<rect x="${col * T * scale + 0.5}" y="${row * T * scale + 0.5}" width="${w * T * scale - 1}" height="${h * T * scale - 1}" fill="none" stroke="#ff2bd6" stroke-width="1"/>`;
		svg += `<text x="${col * T * scale + 2}" y="${row * T * scale + 10}" fill="#fff" stroke="#000" stroke-width="2.5" paint-order="stroke">${n}</text>`;
	}
	svg += "</svg>";
	const base = await sharp(sheet.data, { raw: { width: sheet.width, height: sheet.height, channels: 4 } })
		.resize(sheet.width * scale, sheet.height * scale, { kernel: "nearest" })
		.flatten({ background: "#2b2b3a" })
		.png()
		.toBuffer();
	await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(path.join(outPng, `${id}.png`));
}

/** Every single side by side with its number, for picking the ones not in the sheet. */
async function singlesMontage(id, montage) {
	const scale = 2;
	const width = 900;
	let x = 0, y = 0, rowH = 0;
	const placed = [];
	for (const m of montage) {
		const w = m.single.width * scale + 8;
		const h = m.single.height * scale + 14;
		if (x + w > width) { x = 0; y += rowH; rowH = 0; }
		placed.push({ ...m, x, y });
		x += w;
		rowH = Math.max(rowH, h);
	}
	const height = y + rowH;
	const layers = await Promise.all(
		placed.map(async (p) => ({
			input: await sharp(p.single.data, { raw: { width: p.single.width, height: p.single.height, channels: 4 } }).resize(p.single.width * scale, p.single.height * scale, { kernel: "nearest" }).png().toBuffer(),
			left: p.x + 4,
			top: p.y + 12,
		})),
	);
	let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" font-family="monospace" font-size="10">`;
	for (const p of placed) svg += `<text x="${p.x + 4}" y="${p.y + 10}" fill="#fff">${p.n}</text>`;
	svg += "</svg>";
	await sharp({ create: { width, height, channels: 4, background: "#2b2b3a" } })
		.composite([...layers, { input: Buffer.from(svg), left: 0, top: 0 }])
		.png()
		.toFile(path.join(outPng, `${id}-singles.png`));
}

const ids = [...Object.keys(SINGLES), ...AUTO_CATALOG].filter((id) => !only || id === only);
for (const id of ids) {
	const sheet = await raw(art(SHEETS[id]));
	let items;
	let method;
	let singles = null;
	const montage = [];
	if (SINGLES[id]) {
		method = "singles";
		const dir = art(SINGLES[id]);
		const keys = [...singleKeys(fs.readdirSync(dir).filter((f) => f.endsWith(".png")))];
		const order = (k) => (/^\d+$/.test(k) ? Number(k) : Infinity);
		keys.sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b));
		items = [];
		singles = [];
		for (const [key, file] of keys) {
			const single = await raw(path.join(dir, file));
			const at = locate(sheet, single);
			const size = [single.width / T, single.height / T];
			const tileAligned = at && at.x % T === 0 && at.y % T === 0;
			singles.push([key, ...size, tileAligned ? at.x / T : null, tileAligned ? at.y / T : null, coverage(single)]);
			if (at) items.push([key, ...toTiles(opaqueBox(single, at))]);
			montage.push({ n: key, single });
		}
		const loose = singles.filter((s) => s[3] === null).length;
		if (loose) console.log(`[catalog] ${id}: ${loose} of ${keys.length} singles are assembled or moved (not found as-is in the sheet)`);
	} else {
		method = "detected";
		items = detect(sheet).map((b, i) => [i + 1, ...toTiles(b)]);
	}
	items.sort((a, b) => a[2] - b[2] || a[1] - b[1]);
	const json = {
		sheet: id,
		method,
		// Objects as they appear in the sheet: [key, col, row, w, h] in tiles.
		objects: items,
		// Singles: [key, w, h, col, row, coverage] in tiles; col/row null when not in the
		// sheet as-is; coverage as in coverage() below.
		...(singles ? { singles } : {}),
		// The whole sheet's coverage, one string per tile row, for prefabs cut from it.
		coverage: coverage(sheet).split("/"),
	};
	fs.writeFileSync(path.join(outJson, `${id}.json`), JSON.stringify(json).replace(/\],\[/g, "],\n[") + "\n");
	await contactSheet(id, sheet, items);
	if (montage.length) await singlesMontage(id, montage);
	console.log(`[catalog] ${id}: ${items.length} objects (${method})`);
}
