// A mutable character grid with drawing helpers, used to lay maps out in code.
// Each character is a tile from a legend (see world/greybox/tiles.ts).

export class CharGrid {
	readonly width: number;
	readonly height: number;
	private cells: string[];

	constructor(width: number, height: number, fill: string) {
		this.width = width;
		this.height = height;
		this.cells = Array.from({ length: width * height }, () => fill);
	}

	inBounds(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	}

	get(x: number, y: number): string {
		if (!this.inBounds(x, y)) throw new Error(`(${x}, ${y}) is outside the ${this.width}×${this.height} grid`);
		return this.cells[y * this.width + x];
	}

	set(x: number, y: number, ch: string): this {
		if (this.inBounds(x, y)) this.cells[y * this.width + x] = ch;
		return this;
	}

	rect(x: number, y: number, w: number, h: number, ch: string): this {
		for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, ch);
		return this;
	}

	/** Outline only. */
	frame(x: number, y: number, w: number, h: number, ch: string): this {
		for (let xx = x; xx < x + w; xx++) this.set(xx, y, ch).set(xx, y + h - 1, ch);
		for (let yy = y; yy < y + h; yy++) this.set(x, yy, ch).set(x + w - 1, yy, ch);
		return this;
	}

	/** Horizontal or vertical run of tiles, inclusive at both ends. */
	line(x0: number, y0: number, x1: number, y1: number, ch: string): this {
		if (x0 !== x1 && y0 !== y1) throw new Error("line() draws straight lines only");
		const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
		const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
		for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) this.set(x, y, ch);
		return this;
	}

	/** Stamp rows of characters; spaces in the stamp are transparent. */
	stamp(x: number, y: number, rows: string[]): this {
		rows.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== " " && this.set(x + dx, y + dy, ch)));
		return this;
	}

	/** Replace only where the current tile is one of `onlyOn`. */
	paintOver(x: number, y: number, ch: string, onlyOn: string): this {
		if (this.inBounds(x, y) && onlyOn.includes(this.get(x, y))) this.set(x, y, ch);
		return this;
	}

	rows(): string[] {
		return Array.from({ length: this.height }, (_, y) => this.cells.slice(y * this.width, (y + 1) * this.width).join(""));
	}
}

/** Small deterministic PRNG (mulberry32) so generated maps are identical on every build. */
export function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
