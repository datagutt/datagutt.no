// Walk sheets and dialogue portraits from the LimeZu character and portrait generators,
// stacked per recipe (content/characters.json in a game).
import path from "node:path";
import sharp from "sharp";
import type { CharacterRecipe } from "@datagutt/kai/schema/engine";
import {
	FRAME_HEIGHT,
	FRAME_WIDTH,
	PORTRAIT_ANIMS,
	PORTRAIT_COLUMNS,
	PORTRAIT_CROP,
	PORTRAIT_SOURCE_FRAME,
	SHEET_COLUMNS,
	SHEET_ROWS,
} from "@datagutt/kai/characters/sheet";

type Layer = CharacterRecipe["layers"][number];

const SHEET_W = SHEET_COLUMNS * FRAME_WIDTH;
const SHEET_H = SHEET_ROWS * FRAME_HEIGHT;
const PORTRAIT_ROWS = Object.keys(PORTRAIT_ANIMS).length;
const P = PORTRAIT_CROP.size;

const layerFile = (layer: Layer) => (typeof layer === "string" ? layer : layer.file);

const rgb = (h: string) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

/** Exact colour swaps (hex without #) on raw RGBA pixels, in place. */
export function recolorPixels(data: Uint8Array, map: Record<string, string>): Uint8Array {
	const swaps = new Map(Object.entries(map).map(([from, to]) => [from.toLowerCase(), rgb(to)]));
	for (let i = 0; i < data.length; i += 4) {
		if (!data[i + 3]) continue;
		const key = ((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]).toString(16).padStart(6, "0");
		const to = swaps.get(key);
		if (to) data.set(to, i);
	}
	return data;
}

type PortraitSource = Pick<CharacterRecipe, "layers" | "portrait">;

/**
 * Portrait layers for a recipe: explicit ones, or derived from the sprite layers (the two
 * generators share numbering; outfits don't appear in head portraits). Accessories the
 * portrait generator lacks, such as backpacks, are skipped. A layer can name its own
 * portrait counterpart instead.
 */
export function portraitLayers(recipe: PortraitSource, exists: (file: string) => boolean): string[] | null {
	if (recipe.portrait === false) return null;
	if (Array.isArray(recipe.portrait)) return recipe.portrait;
	return recipe.layers.flatMap((layer) => {
		const file = typeof layer === "string" ? portraitFile(layer, exists) : layer.portrait;
		return file ? [file] : [];
	});
}

function portraitFile(file: string, exists: (file: string) => boolean): string | null {
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
async function loadLayer(dir: string, layer: Layer, recipe: CharacterRecipe, width: number, height: number, what: string): Promise<Buffer> {
	const file = path.join(dir, layerFile(layer));
	const { data, info } = await sharp(file)
		.extract({ left: 0, top: 0, width, height })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })
		.catch((err: Error) => {
			throw new Error(`${what}: layer ${layerFile(layer)} could not be read from the assets repo (${err.message})`);
		});
	if (recipe.recolor) recolorPixels(data, recipe.recolor);
	return sharp(data, { raw: info }).png().toBuffer();
}

const transparent = (width: number, height: number) => ({ create: { width, height, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

async function stack(dir: string, layers: Layer[], recipe: CharacterRecipe, width: number, height: number, what: string): Promise<Buffer> {
	const inputs = [];
	for (const layer of layers) inputs.push({ input: await loadLayer(dir, layer, recipe, width, height, what) });
	return sharp(transparent(width, height)).composite(inputs).png().toBuffer();
}

/** The walk sheet: every layer cropped to the rows we use (Body_01 is wider than the grid). */
export function composeCharacter(charactersDir: string, id: string, recipe: CharacterRecipe): Promise<Buffer> {
	return stack(charactersDir, recipe.layers, recipe, SHEET_W, SHEET_H, `Character "${id}"`);
}

/** Stack the portrait layers, then crop every frame to the area heads actually use. */
export async function composePortrait(portraitsDir: string, id: string, recipe: CharacterRecipe, exists: (file: string) => boolean): Promise<Buffer> {
	const width = PORTRAIT_COLUMNS * PORTRAIT_SOURCE_FRAME;
	const height = PORTRAIT_ROWS * PORTRAIT_SOURCE_FRAME;
	const full = await stack(portraitsDir, portraitLayers(recipe, exists) ?? [], recipe, width, height, `Portrait "${id}"`);
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
