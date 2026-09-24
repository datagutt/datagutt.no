// The link-preview image (Open Graph, 1200×630): the title screen in miniature, drawn
// from the same shapes (components/game/titleScene.ts) and the same waterfront image,
// with the logo in the game's own pixel font. Drawn at 600×315 game pixels, then doubled.
import sharp from "sharp";
import {
	BASE,
	CLOUD_ROW,
	CLOUD_SHAPES,
	CLOUDS,
	COLORS,
	farHeight,
	FJORD,
	midHeight,
	nearHeight,
	SKY_BAND_HEIGHT,
	SKY_BANDS,
	snowline,
	STRIP,
	SUN,
	W,
} from "../components/game/titleScene.ts";
import { Raster, hex } from "@datagutt/kai-assets/raster";

const OG = { w: 600, h: 315 };
/** Where the title scene's origin lands: centred across, its bottom on the image's bottom. */
const DX = (OG.w - W) / 2;
const DY = OG.h - 288;
const NAVY = hex("1b2440");
const INK = hex("0b1320");
const CREAM = hex("fff4d6");
const RED = hex("b83a38");

/** Blend `over` onto the pixel with the given opacity. */
function blend(img, x, y, over, alpha) {
	if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
	const i = (y * img.width + x) * 4;
	for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(img.data[i + c] * (1 - alpha) + over[c] * alpha);
}

function fillColumns(img, heightAt, color) {
	for (let x = 0; x < OG.w; x++) {
		const top = Math.round(heightAt(x - DX)) + DY;
		img.rect(x, top, 1, BASE + DY - top, color);
	}
}

/** Text in the bitmap font, `scale` pixels per font pixel, returning its width. */
function text(img, glyphs, str, x, y, scale, color) {
	let cx = x;
	for (const ch of str) {
		const g = glyphs.get(ch);
		if (!g) continue;
		for (const [px, py] of g.bits) img.rect(cx + px * scale, y + py * scale, scale, scale, color);
		cx += (g.advance + 1) * scale;
	}
	return cx - x - scale;
}
const measure = (glyphs, str, scale) => [...str].reduce((w, ch) => w + ((glyphs.get(ch)?.advance ?? 0) + 1) * scale, -scale);

/**
 * @param {Buffer} waterfront the title strip (world/gen/title.ts) at 1×
 * @param {{ glyphs: Map<string, { advance: number, bits: [number, number][] }>, lineHeight: number }} font
 */
export async function buildOgImage(waterfront, font) {
	const img = new Raster(OG.w, OG.h);
	img.rect(0, 0, OG.w, OG.h, hex(SKY_BANDS[0].slice(1)));
	SKY_BANDS.forEach((color, i) => img.rect(0, DY + i * SKY_BAND_HEIGHT, OG.w, OG.h, hex(color.slice(1))));
	for (const r of SUN.halo) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) blend(img, x + DX, y + DY, hex(COLORS.halo.slice(1)), 0.3);
	for (const r of SUN.disc) img.rect(r.x + DX, r.y + DY, r.w, r.h, hex(COLORS.sun.slice(1)));
	for (const c of CLOUDS) {
		CLOUD_SHAPES[c.shape].forEach(([dx, w], row, rows) =>
			img.rect(c.x + dx + DX, c.y + row * CLOUD_ROW + DY, w, CLOUD_ROW, hex((row === rows.length - 1 ? COLORS.cloudShade : COLORS.cloud).slice(1))),
		);
	}
	fillColumns(img, farHeight, hex(COLORS.far.slice(1)));
	for (let x = 0; x < OG.w; x++) {
		const top = Math.round(farHeight(x - DX));
		const line = Math.round(snowline(x - DX));
		if (top < line) img.rect(x, top + DY, 1, line - top, hex(COLORS.snow.slice(1)));
	}
	fillColumns(img, midHeight, hex(COLORS.mid.slice(1)));
	fillColumns(img, nearHeight, hex(COLORS.near.slice(1)));
	img.rect(0, FJORD.y + DY, OG.w, FJORD.h, hex(COLORS.fjord.slice(1)));

	// The logo: cream letters with a navy outline and a stepped drop shadow, as on the title.
	const { glyphs, lineHeight } = font;
	const scale = 4;
	const logo = "DATAGUTT";
	const lx = Math.round((OG.w - measure(glyphs, logo, scale)) / 2);
	const ly = 34;
	text(img, glyphs, logo, lx + 3, ly + 3, scale, INK);
	text(img, glyphs, logo, lx + 2, ly + 2, scale, NAVY);
	for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) text(img, glyphs, logo, lx + ox, ly + oy, scale, NAVY);
	text(img, glyphs, logo, lx, ly, scale, CREAM);

	// The "Fjord Town" banner under it.
	const sub = "FJORD TOWN";
	const sw = measure(glyphs, sub, 1);
	const bx = Math.round((OG.w - sw) / 2) - 8;
	const by = ly + lineHeight * scale + 10;
	img.rect(bx + 2, by + 2, sw + 16, lineHeight + 8, NAVY);
	img.rect(bx - 1, by - 1, sw + 18, lineHeight + 10, NAVY);
	img.rect(bx, by, sw + 16, lineHeight + 8, RED);
	text(img, glyphs, sub, bx + 8, by + 4, 1, CREAM);

	// The waterfront is wider than the image: keep its middle.
	const cut = -(STRIP.x + DX);
	const front = await sharp(waterfront).extract({ left: cut, top: 0, width: OG.w, height: STRIP.h }).png().toBuffer();
	const composed = await sharp(await img.toPng())
		.composite([{ input: front, left: 0, top: STRIP.y + DY }])
		.png()
		.toBuffer();
	return sharp(composed).resize(OG.w * 2, OG.h * 2, { kernel: "nearest" }).png().toBuffer();
}
