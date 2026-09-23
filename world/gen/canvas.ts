// A map under construction: tile layers of LimeZu tile references, an explicit collision
// layer, and map objects. The generator paints into it; tiled.ts writes it out.
import type { MapObject } from "../../game/world/objects.ts";
import { pieceAt, variant, type AutotileSet, type Mask, type TileRef } from "../art/autotile.ts";

/**
 * Drawing order, bottom to top: base terrain, terrain transitions, paving and small
 * details, things that stand up, soft shadows (`shade`), then roofs and tree tops that
 * draw over characters (`above`). Lights are map objects, drawn over all of it.
 */
export const LAYERS = ["ground", "ground2", "decal", "below", "shade", "above"] as const;
export type LayerName = (typeof LAYERS)[number];

/** Layers drawn with a blend mode instead of plain alpha (fx tiles from world/gen/fx.ts). */
export const LAYER_BLEND: Partial<Record<LayerName, "multiply" | "add">> = { shade: "multiply" };

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
	/** Per-row layers, top to bottom, overriding `aboveRows` and `flat`. */
	rowLayers?: LayerName[];
	/** A deliberate crop of an object (say why); the cut check lets it through. */
	allowCut?: string;
	/**
	 * How much of each tile the art fills ("#" solid, "+" a little, "." empty), rows
	 * joined by "/", from the catalogue. Without explicit `collision`, only solid tiles
	 * below `aboveRows` block, so empty margins and wisps don't make rooms tight.
	 */
	coverage?: string;
};

/** Tiled's tile transform flags, as bits of a TileRef's `flip` (and of a gid, shifted up). */
export const FLIP = { H: 1, V: 2, D: 4 } as const;

/**
 * How a prefab is turned when stamped. Mirroring suits most LimeZu sprites; rotations
 * only suit flat things seen straight from above (rugs, tables), since the art is drawn
 * in 3/4 view with light from one side. Prefer a sheet's own pre-drawn orientations.
 */
export type Transform = "flipX" | "flipY" | "rot90" | "rot180" | "rot270";

const TRANSFORMS: Record<Transform, { flags: number; at: (dx: number, dy: number, w: number, h: number) => [number, number] }> = {
	flipX: { flags: FLIP.H, at: (dx, dy, w) => [w - 1 - dx, dy] },
	flipY: { flags: FLIP.V, at: (dx, dy, _w, h) => [dx, h - 1 - dy] },
	rot90: { flags: FLIP.D | FLIP.H, at: (dx, dy, _w, h) => [h - 1 - dy, dx] },
	rot180: { flags: FLIP.H | FLIP.V, at: (dx, dy, w, h) => [w - 1 - dx, h - 1 - dy] },
	rot270: { flags: FLIP.D | FLIP.V, at: (dx, dy, w) => [dy, w - 1 - dx] },
};

export class MapCanvas {
	readonly width: number;
	readonly height: number;
	readonly layers: Record<LayerName, (TileRef | null)[]>;
	readonly collision: Uint8Array;
	readonly objects: MapObject[] = [];
	/** Every prefab stamped, for checking that none cuts an object in half (cuts.ts). */
	readonly stamped: Prefab[] = [];

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

	/**
	 * Place a prefab with its top-left corner at (x, y), optionally mirrored or rotated.
	 * Transparent tiles still overwrite.
	 */
	stamp(prefab: Prefab, x: number, y: number, transform?: Transform): this {
		this.stamped.push(prefab);
		const t = transform ? TRANSFORMS[transform] : null;
		const place = (dx: number, dy: number): [number, number] => (t ? t.at(dx, dy, prefab.w, prefab.h) : [dx, dy]);
		for (let dy = 0; dy < prefab.h; dy++) {
			const layer: LayerName = prefab.rowLayers?.[dy] ?? (dy < prefab.aboveRows ? "above" : prefab.flat ? "ground2" : "below");
			for (let dx = 0; dx < prefab.w; dx++) {
				const [tx, ty] = place(dx, dy);
				this.put(layer, x + tx, y + ty, { sheet: prefab.sheet, col: prefab.col + dx, row: prefab.row + dy, ...(t ? { flip: t.flags } : {}) });
			}
		}
		const rows =
			prefab.collision ??
			prefab.coverage?.split("/").slice(prefab.aboveRows).map((r) => r.replace(/\+/g, ".")) ??
			Array.from({ length: prefab.h - prefab.aboveRows }, () => "#".repeat(prefab.w));
		const top = prefab.h - rows.length;
		rows.forEach((row, dy) =>
			[...row].forEach((c, dx) => {
				if (c !== "#") return;
				const [tx, ty] = place(dx, top + dy);
				this.block(x + tx, y + ty);
			}),
		);
		if (prefab.door) {
			const [tx, ty] = place(prefab.door[0], prefab.door[1]);
			this.block(x + tx, y + ty, false);
		}
		return this;
	}

	add(obj: MapObject): this {
		this.objects.push(obj);
		return this;
	}
}
