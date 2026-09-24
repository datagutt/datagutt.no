// Autotiling: given which cells belong to a region, pick the piece (corner, edge, centre
// or inner corner) for each cell. Regions must be at least 2 cells thick everywhere;
// `thicken` enforces that before tiling. An art adapter maps pieces to its sheets' tiles
// as an AutotileSet.

/**
 * One tile of a sheet. `flip` holds Tiled's per-tile transform bits (see FLIP in
 * canvas.ts); the same sheet tile keeps one id however it is turned.
 */
export type TileRef = {
	sheet: string;
	col: number;
	row: number;
	flip?: number;
	/**
	 * A stacked tile: these tiles drawn bottom to top into one atlas tile (each with its own
	 * flip). Used where objects overlap, since a map cell holds one tile per layer.
	 */
	parts?: TileRef[];
};

export type Piece =
	| "center"
	| "n"
	| "s"
	| "e"
	| "w"
	| "nw"
	| "ne"
	| "sw"
	| "se"
	/** Inner corners: named for the one diagonal neighbour that is outside the region. */
	| "inner_nw"
	| "inner_ne"
	| "inner_sw"
	| "inner_se";

/** Tiles for every piece; several tiles for a piece are variants picked per cell. */
export type AutotileSet = Record<Piece, TileRef[]>;

/** Stable per-cell variant choice, so maps are identical on every build. */
export function variant<T>(options: readonly T[], x: number, y: number): T {
	const h = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
	return options[h % options.length];
}

export type Mask = { width: number; height: number; get(x: number, y: number): boolean };

/** Which piece a cell of the region needs, or null for cells outside it. */
export function pieceAt(mask: Mask, x: number, y: number, outsideIsRegion = true): Piece | null {
	if (!mask.get(x, y)) return null;
	const at = (dx: number, dy: number) => {
		const nx = x + dx;
		const ny = y + dy;
		if (nx < 0 || ny < 0 || nx >= mask.width || ny >= mask.height) return outsideIsRegion;
		return mask.get(nx, ny);
	};
	const n = at(0, -1);
	const s = at(0, 1);
	const w = at(-1, 0);
	const e = at(1, 0);
	if (!n && !w) return "nw";
	if (!n && !e) return "ne";
	if (!s && !w) return "sw";
	if (!s && !e) return "se";
	if (!n) return "n";
	if (!s) return "s";
	if (!w) return "w";
	if (!e) return "e";
	if (!at(-1, -1)) return "inner_nw";
	if (!at(1, -1)) return "inner_ne";
	if (!at(-1, 1)) return "inner_sw";
	if (!at(1, 1)) return "inner_se";
	return "center";
}

/**
 * Make a region drawable by the 13-piece set: every region cell and every gap cell must
 * sit in a 2×2 block of its own kind. Thin gaps are filled, thin strips are grown.
 * Returns a new mask as a boolean grid.
 */
export function thicken(mask: Mask, outsideIsRegion = true): boolean[][] {
	const grid = Array.from({ length: mask.height }, (_, y) => Array.from({ length: mask.width }, (_, x) => mask.get(x, y)));
	const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < mask.width && y < mask.height;
	const inTwoByTwo = (x: number, y: number, want: boolean) =>
		[
			[0, 0],
			[-1, 0],
			[0, -1],
			[-1, -1],
		].some(([ox, oy]) =>
			[0, 1].every((dy) =>
				[0, 1].every((dx) => {
					const nx = x + ox + dx;
					const ny = y + oy + dy;
					// Off the map counts as region or not, as in pieceAt.
					return inBounds(nx, ny) ? grid[ny][nx] === want : outsideIsRegion === want;
				}),
			),
		);
	for (let pass = 0; pass < 4; pass++) {
		let changed = false;
		// Gaps (holes, channels) thinner than 2 cells can't be drawn either: fill them in.
		for (let y = 0; y < mask.height; y++) {
			for (let x = 0; x < mask.width; x++) {
				if (!grid[y][x] && !inTwoByTwo(x, y, false)) {
					grid[y][x] = true;
					changed = true;
				}
			}
		}
		for (let y = 0; y < mask.height; y++) {
			for (let x = 0; x < mask.width; x++) {
				if (!grid[y][x]) continue;
				if (inTwoByTwo(x, y, true)) continue;
				// Grow to the right and down (or left/up at the edges) to complete a 2×2.
				const gx = inBounds(x + 1, y) ? 1 : -1;
				const gy = inBounds(x, y + 1) ? 1 : -1;
				for (const [dx, dy] of [
					[gx, 0],
					[0, gy],
					[gx, gy],
				]) {
					if (inBounds(x + dx, y + dy) && !grid[y + dy][x + dx]) {
						grid[y + dy][x + dx] = true;
						changed = true;
					}
				}
			}
		}
		// Diagonal-only touches (two cells meeting at a corner) also can't be drawn: fill them.
		for (let y = 0; y + 1 < mask.height; y++) {
			for (let x = 0; x + 1 < mask.width; x++) {
				const a = grid[y][x];
				const b = grid[y][x + 1];
				const c = grid[y + 1][x];
				const d = grid[y + 1][x + 1];
				if ((a && d && !b && !c) || (b && c && !a && !d)) {
					grid[y][x] = grid[y][x + 1] = grid[y + 1][x] = grid[y + 1][x + 1] = true;
					changed = true;
				}
			}
		}
		if (!changed) break;
	}
	return grid;
}

export function gridMask(grid: boolean[][]): Mask {
	return { width: grid[0]?.length ?? 0, height: grid.length, get: (x, y) => grid[y]?.[x] ?? false };
}
