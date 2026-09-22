// Tiny RGBA raster for drawing generated art (greybox tiles, placeholder sprites).
import sharp from "sharp";

export const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];

export class Raster {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.data = new Uint8Array(width * height * 4);
	}

	px(x, y, rgba) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
		this.data.set(rgba, (y * this.width + x) * 4);
	}

	rect(x, y, w, h, rgba) {
		for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, rgba);
	}

	toPng() {
		return sharp(Buffer.from(this.data), { raw: { width: this.width, height: this.height, channels: 4 } }).png().toBuffer();
	}
}
