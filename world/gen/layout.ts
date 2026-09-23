// Layout helpers for map generators: boolean regions that terrain autotiling paints,
// and seeded smooth noise for natural edges (coastlines, forest borders).
import { gridMask, thicken, type Mask } from "../art/autotile.ts";
import { seeded } from "./random.ts";

export class Region {
	readonly width: number;
	readonly height: number;
	readonly cells: Uint8Array;

	constructor(width: number, height: number, cells?: Uint8Array) {
		this.width = width;
		this.height = height;
		this.cells = cells ?? new Uint8Array(width * height);
	}

	static from(width: number, height: number, test: (x: number, y: number) => boolean): Region {
		const r = new Region(width, height);
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (test(x, y)) r.cells[y * width + x] = 1;
		return r;
	}

	has(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height && this.cells[y * this.width + x] === 1;
	}

	set(x: number, y: number, on = true): this {
		if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.cells[y * this.width + x] = on ? 1 : 0;
		return this;
	}

	rect(x: number, y: number, w: number, h: number, on = true): this {
		for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, on);
		return this;
	}

	ellipse(cx: number, cy: number, rx: number, ry: number, on = true): this {
		for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
			for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
				if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, on);
			}
		}
		return this;
	}

	/** A path of the given width through waypoints, in straight horizontal/vertical runs. */
	path(points: [number, number][], width = 2, on = true): this {
		for (let i = 1; i < points.length; i++) {
			const [x0, y0] = points[i - 1];
			const [x1, y1] = points[i];
			const x = Math.min(x0, x1);
			const y = Math.min(y0, y1);
			this.rect(x, y, Math.abs(x1 - x0) + width, Math.abs(y1 - y0) + width, on);
		}
		return this;
	}

	union(other: Region): this {
		other.cells.forEach((v, i) => v && (this.cells[i] = 1));
		return this;
	}

	subtract(other: Region): this {
		other.cells.forEach((v, i) => v && (this.cells[i] = 0));
		return this;
	}

	clone(): Region {
		return new Region(this.width, this.height, new Uint8Array(this.cells));
	}

	/** Grow by one cell in the four directions, `times` times. */
	grow(times = 1): Region {
		let r: Region = this.clone();
		for (let t = 0; t < times; t++) {
			const src = r;
			r = Region.from(this.width, this.height, (x, y) => src.has(x, y) || src.has(x - 1, y) || src.has(x + 1, y) || src.has(x, y - 1) || src.has(x, y + 1));
		}
		return r;
	}

	mask(): Mask {
		return { width: this.width, height: this.height, get: (x, y) => this.has(x, y) };
	}

	/** The region made drawable by a 13-piece autotile set (see autotile.thicken). */
	drawable(edge: "inside" | "outside" = "outside"): Mask {
		return gridMask(thicken(this.mask(), edge === "inside"));
	}

	each(fn: (x: number, y: number) => void) {
		for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) if (this.has(x, y)) fn(x, y);
	}
}

/** Smooth 1D noise in [-1, 1]: seeded random values every `scale` cells, cosine-blended. */
export function wobble(seed: number, length: number, scale: number): number[] {
	const rand = seeded(seed);
	const knots = Array.from({ length: Math.ceil(length / scale) + 2 }, () => rand() * 2 - 1);
	return Array.from({ length }, (_, i) => {
		const k = Math.floor(i / scale);
		const t = (1 - Math.cos(((i % scale) / scale) * Math.PI)) / 2;
		return knots[k] * (1 - t) + knots[k + 1] * t;
	});
}

/** Smooth 2D value noise in [0, 1] with features about `scale` cells across. */
export function noise2(seed: number, scale: number): (x: number, y: number) => number {
	const hash = (ix: number, iy: number) => {
		let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
		h = Math.imul(h ^ (h >>> 13), 1274126177);
		return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
	};
	const smooth = (t: number) => t * t * (3 - 2 * t);
	return (x, y) => {
		const fx = x / scale;
		const fy = y / scale;
		const ix = Math.floor(fx);
		const iy = Math.floor(fy);
		const tx = smooth(fx - ix);
		const ty = smooth(fy - iy);
		const top = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
		const bottom = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
		return top * (1 - ty) + bottom * ty;
	};
}
