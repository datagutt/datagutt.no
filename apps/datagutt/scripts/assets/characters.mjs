// Walk sheets and dialogue portraits from the LimeZu character and portrait generators,
// stacked per recipe (game/assets/manifest.ts), plus stand-ins of the same shape for
// placeholder builds.
import path from "node:path";
import sharp from "sharp";
import {
	ANIMS,
	DIRECTIONS,
	FRAME_HEIGHT,
	FRAME_WIDTH,
	PORTRAIT_ANIMS,
	PORTRAIT_COLUMNS,
	PORTRAIT_CROP,
	PORTRAIT_SOURCE_FRAME,
	SHEET_COLUMNS,
	SHEET_ROWS,
} from "../../game/characters/sheet.ts";
import { Raster, hex } from "./raster.mjs";

const SHEET_W = SHEET_COLUMNS * FRAME_WIDTH;
const SHEET_H = SHEET_ROWS * FRAME_HEIGHT;
const PORTRAIT_ROWS = Object.keys(PORTRAIT_ANIMS).length;
const P = PORTRAIT_CROP.size;
const INK = hex("1b1b24");

const layerFile = (layer) => (typeof layer === "string" ? layer : layer.file);

/** Exact colour swaps (hex without #) on raw RGBA pixels, in place. */
export function recolorPixels(data, map) {
	const swaps = new Map(Object.entries(map).map(([from, to]) => [from.toLowerCase(), hex(to)]));
	for (let i = 0; i < data.length; i += 4) {
		if (!data[i + 3]) continue;
		const key = ((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]).toString(16).padStart(6, "0");
		const to = swaps.get(key);
		if (to) data.set(to.slice(0, 3), i);
	}
	return data;
}

/**
 * Portrait layers for a recipe: explicit ones, or derived from the sprite layers (the two
 * generators share numbering; outfits don't appear in head portraits). Accessories the
 * portrait generator lacks, such as backpacks, are skipped. A layer can name its own
 * portrait counterpart instead.
 */
export function portraitLayers(recipe, exists) {
	if (recipe.portrait === false) return null;
	if (Array.isArray(recipe.portrait)) return recipe.portrait;
	return recipe.layers.flatMap((layer) => {
		const file = typeof layer === "string" ? portraitFile(layer, exists) : layer.portrait;
		return file ? [file] : [];
	});
}

function portraitFile(file, exists) {
	let m;
	if ((m = /^Bodies\/Body_0?(\d+)\.png$/.exec(file))) return `Skins/PG_Skin_${Number(m[1])}.png`;
	if ((m = /^Eyes\/Eyes_(\d+)\.png$/.exec(file))) return `Eyes/PG_Eyes_${m[1]}.png`;
	if ((m = /^Hairstyles\/Hairstyle_(\d+)_0?(\d+)\.png$/.exec(file))) return `Hairstyles/PG_Hairstyle_${m[1]}_${Number(m[2])}.png`;
	if ((m = /^Accessories\/Accessory_(.+)_0?(\d+)\.png$/.exec(file))) {
		const candidate = `Accessories/PG_Accessory_${m[1]}_${Number(m[2])}.png`;
		return exists(candidate) ? candidate : null;
	}
	return null;
}

/** One layer cropped to the sheet, with the recipe's colour swaps. */
async function loadLayer(dir, layer, recipe, width, height, what) {
	const file = path.join(dir, layerFile(layer));
	const { data, info } = await sharp(file)
		.extract({ left: 0, top: 0, width, height })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })
		.catch((err) => {
			throw new Error(`${what}: layer ${layerFile(layer)} could not be read from the assets repo (${err.message})`);
		});
	if (recipe.recolor) recolorPixels(data, recipe.recolor);
	return sharp(data, { raw: info }).png().toBuffer();
}

const transparent = (width, height) => ({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

async function stack(dir, layers, recipe, width, height, what) {
	const inputs = [];
	for (const layer of layers) inputs.push({ input: await loadLayer(dir, layer, recipe, width, height, what) });
	return sharp(transparent(width, height)).composite(inputs).png().toBuffer();
}

/** The walk sheet: every layer cropped to the rows we use (Body_01 is wider than the grid). */
export function composeCharacter(charactersDir, id, recipe) {
	return stack(charactersDir, recipe.layers, recipe, SHEET_W, SHEET_H, `Character "${id}"`);
}

/** Stack the portrait layers, then crop every frame to the area heads actually use. */
export async function composePortrait(portraitsDir, id, recipe, exists) {
	const width = PORTRAIT_COLUMNS * PORTRAIT_SOURCE_FRAME;
	const height = PORTRAIT_ROWS * PORTRAIT_SOURCE_FRAME;
	const full = await stack(portraitsDir, portraitLayers(recipe, exists), recipe, width, height, `Portrait "${id}"`);
	const frames = [];
	for (let row = 0; row < PORTRAIT_ROWS; row++) {
		for (let col = 0; col < PORTRAIT_COLUMNS; col++) {
			const input = await sharp(full)
				.extract({
					left: col * PORTRAIT_SOURCE_FRAME + PORTRAIT_CROP.x,
					top: row * PORTRAIT_SOURCE_FRAME + PORTRAIT_CROP.y,
					width: P,
					height: P,
				})
				.png()
				.toBuffer();
			frames.push({ input, left: col * P, top: row * P });
		}
	}
	return sharp(transparent(PORTRAIT_COLUMNS * P, PORTRAIT_ROWS * P)).composite(frames).png().toBuffer();
}

/** A stand-in figure with the same frame layout: body colour, lighter head, eyes that face. */
export function placeholderCharacter(recipe) {
	const img = new Raster(SHEET_W, SHEET_H);
	const body = hex(recipe.placeholder);
	const head = [...body.slice(0, 3).map((c) => Math.min(255, c + 70)), 255];
	for (const spec of Object.values(ANIMS)) {
		DIRECTIONS.forEach((dir, d) => {
			for (let f = 0; f < spec.framesPerDirection; f++) {
				const ox = (d * spec.framesPerDirection + f) * FRAME_WIDTH;
				const oy = spec.row * FRAME_HEIGHT;
				const bob = spec === ANIMS.walk ? f % 2 : 0;
				img.rect(ox + 3, oy + 12 + bob, 10, 9, INK);
				img.rect(ox + 4, oy + 13 + bob, 8, 7, head);
				img.rect(ox + 4, oy + 21 + bob, 8, 7, body);
				const step = spec === ANIMS.walk ? (f % 3) - 1 : 0;
				img.rect(ox + 5 + step, oy + 28, 2, 3, INK);
				img.rect(ox + 9 - step, oy + 28, 2, 3, INK);
				const eyes = { right: [9, 11], left: [4, 6], down: [5, 9], up: null }[dir];
				if (eyes) for (const ex of eyes) img.rect(ox + ex, oy + 16 + bob, 1, 2, INK);
			}
		});
	}
	return img.toPng();
}

/** A stand-in face: talking opens and closes the mouth, nodding bobs, shaking sways. */
export function placeholderPortrait(recipe) {
	const img = new Raster(PORTRAIT_COLUMNS * P, PORTRAIT_ROWS * P);
	const skin = hex(recipe.placeholder);
	const light = [...skin.slice(0, 3).map((c) => Math.min(255, c + 70)), 255];
	for (let row = 0; row < PORTRAIT_ROWS; row++) {
		for (let col = 0; col < PORTRAIT_COLUMNS; col++) {
			const dx = row === 2 ? [0, -1, -2, -1, 0, 1, 2, 1, 0, 0][col] : 0;
			const dy = row === 1 ? [0, 1, 2, 1, 0, 1, 2, 1, 0, 0][col] : 0;
			const ox = col * P + 5 + dx;
			const oy = row * P + 4 + dy;
			img.rect(ox, oy, 15, 16, INK);
			img.rect(ox + 1, oy + 1, 13, 14, light);
			img.rect(ox + 1, oy + 1, 13, 4, skin);
			img.rect(ox + 4, oy + 7, 1, 2, INK);
			img.rect(ox + 10, oy + 7, 1, 2, INK);
			const open = row === 0 && col % 2 === 1;
			img.rect(ox + 6, oy + 11, 3, open ? 2 : 1, INK);
		}
	}
	return img.toPng();
}
