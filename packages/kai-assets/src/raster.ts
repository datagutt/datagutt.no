// Tiny RGBA raster for drawing generated art (greybox tiles, placeholder sprites).
import sharp from "sharp";

export type Rgba = [number, number, number, number];

export const hex = (h: string): Rgba => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];

export class Raster {
	readonly data: Uint8Array;

	constructor(
		readonly width: number,
		readonly height: number,
	) {
		this.data = new Uint8Array(width * height * 4);
	}

	px(x: number, y: number, rgba: readonly number[]) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
		this.data.set(rgba, (y * this.width + x) * 4);
	}

	rect(x: number, y: number, w: number, h: number, rgba: readonly number[]) {
		for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, rgba);
	}

	toPng(): Promise<Buffer> {
		return sharp(Buffer.from(this.data), { raw: { width: this.width, height: this.height, channels: 4 } }).png().toBuffer();
	}
}
