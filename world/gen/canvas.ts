// A map under construction: tile layers of LimeZu tile references, an explicit collision
// layer, and map objects. The generator paints into it; tiled.ts writes it out.
import type { MapObject } from "../../game/world/objects.ts";
import { pieceAt, variant, type AutotileSet, type Mask, type TileRef } from "../art/autotile.ts";

/**
 * Drawing order, bottom to top: base terrain, terrain transitions, paving and small
 * details, then things that stand up. `above` draws over characters (roofs, tree tops).
 */
export const LAYERS = ["ground", "ground2", "decal", "below", "above"] as const;
export type LayerName = (typeof LAYERS)[number];

/** A multi-tile piece cut from a sheet: a building, tree or prop. */
export type Prefab = {
	sheet: string;
	col: number;
	row: number;
	w: number;
	h: number;
	/** Rows from the top that draw above characters (roofs, canopies). */
	aboveRows: number;
	/**
	 * Which cells block movement, one string per row, "#" blocked and "." free. Rows
	 * missing at the top are free. Omit to block the whole bottom `h - aboveRows` rows.
	 */
	collision?: string[];
	/** Put the lower part on `ground2` instead of `below` (rugs, flat things). */
	flat?: boolean;
	/** The door tile, relative to the top-left corner. It stays walkable. */
	door?: [number, number];
};

export class MapCanvas {
	readonly width: number;
	readonly height: number;
	readonly layers: Record<LayerName, (TileRef | null)[]>;
	readonly collision: Uint8Array;
	readonly objects: MapObject[] = [];

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.layers = Object.fromEntries(LAYERS.map((l) => [l, Array<TileRef | null>(width * height).fill(null)])) as Record<
			LayerName,
			(TileRef | null)[]
		>;
		this.collision = new Uint8Array(width * height);
	}

	inBounds(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	}

	put(layer: LayerName, x: number, y: number, tile: TileRef | null): this {
		if (this.inBounds(x, y)) this.layers[layer][y * this.width + x] = tile;
		return this;
	}

	get(layer: LayerName, x: number, y: number): TileRef | null {
		return this.inBounds(x, y) ? this.layers[layer][y * this.width + x] : null;
	}

	/** Fill a layer; `pick` can vary the tile per cell (grass variants and the like). */
	fill(layer: LayerName, pick: (x: number, y: number) => TileRef | null): this {
		for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) this.put(layer, x, y, pick(x, y));
		return this;
	}

	block(x: number, y: number, blocked = true): this {
		if (this.inBounds(x, y)) this.collision[y * this.width + x] = blocked ? 1 : 0;
		return this;
	}

	isBlocked(x: number, y: number): boolean {
		return !this.inBounds(x, y) || this.collision[y * this.width + x] === 1;
	}

	/**
	 * Paint a terrain region with a 13-piece autotile block (the mask must already be
	 * thickened). `centers` optionally varies the centre tile. `edge: "inside"` means the
	 * region continues past the map edge (open water); "outside" closes it (a pond).
	 */
	autotile(
		layer: LayerName,
		mask: Mask,
		set: AutotileSet,
		options: { centers?: (x: number, y: number) => TileRef; edge?: "inside" | "outside" } = {},
	): this {
		const outside = (options.edge ?? "outside") === "inside";
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const piece = pieceAt(mask, x, y, outside);
				if (!piece) continue;
				this.put(layer, x, y, piece === "center" && options.centers ? options.centers(x, y) : variant(set[piece], x, y));
			}
		}
		return this;
	}

	/** Place a prefab with its top-left corner at (x, y). Transparent tiles still overwrite. */
	stamp(prefab: Prefab, x: number, y: number): this {
		for (let dy = 0; dy < prefab.h; dy++) {
			const layer: LayerName = dy < prefab.aboveRows ? "above" : prefab.flat ? "ground2" : "below";
			for (let dx = 0; dx < prefab.w; dx++) {
				this.put(layer, x + dx, y + dy, { sheet: prefab.sheet, col: prefab.col + dx, row: prefab.row + dy });
			}
		}
		const rows = prefab.collision ?? Array.from({ length: prefab.h - prefab.aboveRows }, () => "#".repeat(prefab.w));
		const top = prefab.h - rows.length;
		rows.forEach((row, dy) => [...row].forEach((c, dx) => c === "#" && this.block(x + dx, y + top + dy)));
		if (prefab.door) this.block(x + prefab.door[0], y + prefab.door[1], false);
		return this;
	}

	add(obj: MapObject): this {
		this.objects.push(obj);
		return this;
	}
}
