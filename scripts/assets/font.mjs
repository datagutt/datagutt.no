// Turns a pixel-grid outline font (Geist Pixel, OFL) into a BMFont that Phaser can
// render crisply: each output pixel is on when its centre falls inside the glyph.
import fs from "node:fs";
import opentype from "opentype.js";
import wawoff from "wawoff2";
import { Raster, hex } from "./raster.mjs";

export const FONT_CHARS =
	" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
	"ÆØÅæøåéèëüöäÉ—–…•’‘“”";

/** Straight-edge contours of a glyph path in font units (y up). */
function contoursOf(path) {
	const contours = [];
	let current = [];
	for (const c of path.commands) {
		if (c.type === "M") {
			if (current.length) contours.push(current);
			current = [[c.x, c.y]];
		} else if (c.type === "L") {
			current.push([c.x, c.y]);
		} else if (c.type === "Z") {
			if (current.length) contours.push(current);
			current = [];
		} else {
			// Curves would need flattening; pixel fonts do not use them.
			current.push([c.x, c.y]);
		}
	}
	if (current.length) contours.push(current);
	return contours;
}

/** Non-zero winding test. */
function inside(contours, x, y) {
	let winding = 0;
	for (const pts of contours) {
		for (let i = 0; i < pts.length; i++) {
			const [x0, y0] = pts[i];
			const [x1, y1] = pts[(i + 1) % pts.length];
			if (y0 <= y) {
				if (y1 > y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0) winding++;
			} else if (y1 <= y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0) {
				winding--;
			}
		}
	}
	return winding !== 0;
}

/** Where inside each output pixel to sample; a quarter keeps half-pixel details like the arm of "r". */
const SAMPLE_PHASE = 0.25;

/**
 * @param {string} woff2Path
 * @param {number} unit font units per output pixel
 * @returns {Promise<{ png: Buffer, xml: string, lineHeight: number }>}
 */
export async function buildBitmapFont(woff2Path, unit, face) {
	const ttf = await wawoff.decompress(fs.readFileSync(woff2Path));
	const font = opentype.parse(Buffer.from(ttf).buffer);
	const ascent = Math.round(font.ascender / unit);
	const descent = Math.round(-font.descender / unit);
	const cellHeight = ascent + descent;

	const glyphs = [];
	for (const ch of FONT_CHARS) {
		const g = font.charToGlyph(ch);
		if (!g || g.index === 0) continue;
		const advance = Math.round(g.advanceWidth / unit);
		const contours = contoursOf(g.path);
		const bits = [];
		for (let py = 0; py < cellHeight; py++) {
			for (let px = 0; px < advance; px++) {
				const fx = (px + SAMPLE_PHASE) * unit;
				const fy = (ascent - py - SAMPLE_PHASE) * unit;
				if (inside(contours, fx, fy)) bits.push([px, py]);
			}
		}
		glyphs.push({ ch, code: ch.codePointAt(0), advance, bits });
	}

	// The font's ascender leaves empty rows above even accented capitals: trim them.
	const top = Math.min(...glyphs.flatMap((g) => g.bits.map(([, py]) => py)));
	const bottom = Math.max(...glyphs.flatMap((g) => g.bits.map(([, py]) => py)));
	for (const g of glyphs) g.bits = g.bits.map(([px, py]) => [px, py - top]);
	const lineHeight = bottom - top + 1;
	const base = ascent - top;

	// Pack glyph cells in rows on a 256-wide sheet, 1 px apart.
	const sheetWidth = 256;
	let x = 0;
	let y = 0;
	for (const g of glyphs) {
		if (x + g.advance > sheetWidth) {
			x = 0;
			y += lineHeight + 1;
		}
		g.x = x;
		g.y = y;
		x += g.advance + 1;
	}
	const sheetHeight = y + lineHeight;
	const img = new Raster(sheetWidth, sheetHeight);
	const white = hex("ffffff");
	for (const g of glyphs) for (const [px, py] of g.bits) img.px(g.x + px, g.y + py, white);

	const chars = glyphs
		.map(
			(g) =>
				`<char id="${g.code}" x="${g.x}" y="${g.y}" width="${g.advance}" height="${lineHeight}" xoffset="0" yoffset="0" xadvance="${g.advance}" page="0" chnl="15"/>`,
		)
		.join("\n\t\t");
	const xml = `<?xml version="1.0"?>
<font>
	<info face="${face}" size="${lineHeight}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="1,1"/>
	<common lineHeight="${lineHeight}" base="${base}" scaleW="${sheetWidth}" scaleH="${sheetHeight}" pages="1" packed="0"/>
	<pages><page id="0" file="${face}.png"/></pages>
	<chars count="${glyphs.length}">
		${chars}
	</chars>
</font>
`;
	return { png: await img.toPng(), xml, lineHeight };
}
