// Stand-ins for licensed art, drawn in code, so a fresh clone builds and plays: characters
// and portraits in the right frame layout, and animated sprite strips.
import type { CharacterRecipe } from "@datagutt/kai/schema/engine";
import {
	ANIMS,
	DIRECTIONS,
	FRAME_HEIGHT,
	FRAME_WIDTH,
	PORTRAIT_ANIMS,
	PORTRAIT_COLUMNS,
	PORTRAIT_CROP,
	SHEET_COLUMNS,
	SHEET_ROWS,
} from "@datagutt/kai/characters/sheet";
import { hex, Raster } from "../raster.ts";

const SHEET_W = SHEET_COLUMNS * FRAME_WIDTH;
const SHEET_H = SHEET_ROWS * FRAME_HEIGHT;
const PORTRAIT_ROWS = Object.keys(PORTRAIT_ANIMS).length;
const P = PORTRAIT_CROP.size;
const INK = hex("1b1b24");

const lighter = (rgba: number[]) => [...rgba.slice(0, 3).map((c) => Math.min(255, c + 70)), 255];

/** A stand-in figure with the same frame layout: body colour, lighter head, eyes that face. */
export function placeholderCharacter(recipe: Pick<CharacterRecipe, "placeholder">): Promise<Buffer> {
	const img = new Raster(SHEET_W, SHEET_H);
	const body = hex(recipe.placeholder);
	const head = lighter(body);
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
export function placeholderPortrait(recipe: Pick<CharacterRecipe, "placeholder">): Promise<Buffer> {
	const img = new Raster(PORTRAIT_COLUMNS * P, PORTRAIT_ROWS * P);
	const skin = hex(recipe.placeholder);
	const light = lighter(skin);
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

/** A grey shape in the lower middle of each frame of a sprite strip, breathing. */
export function placeholderSprite({ frameWidth, frameHeight, frames }: { frameWidth: number; frameHeight: number; frames: number }): Promise<Buffer> {
	const img = new Raster(frameWidth * frames, frameHeight);
	const width = Math.max(2, Math.round(frameWidth / 2));
	const height = Math.max(2, Math.round(frameHeight * 0.4));
	for (let f = 0; f < frames; f++) {
		const inhale = f % 4 < 2 ? 1 : 0;
		img.rect(f * frameWidth + Math.round((frameWidth - width) / 2), frameHeight - height - 1 + (1 - inhale), width, height - 1 + inhale, hex("8a8fa8"));
	}
	return img.toPng();
}
