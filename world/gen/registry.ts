// Stable tile ids for generated maps (docs/game/PLAN.md M3.1). Maps store ids into one
// packed tileset; this registry says which LimeZu tile each id is. It is append-only, so
// committed maps keep meaning the same tiles when new tiles are registered.
import type { TileRef } from "../art/autotile.ts";

/** Ids 0 and 1 are reserved for the collision layers: block and unblock. */
export const RESERVED = ["@collision", "@clear"] as const;
export const COLLISION_ID = 0;
export const CLEAR_ID = 1;

/** The packed tileset has a fixed size so maps don't change when the registry grows. */
export const ATLAS_COLUMNS = 128;
export const ATLAS_CAPACITY = 128 * 128;

export type RegistryFile = { tiles: string[] };

const simpleKey = (ref: TileRef) => `${ref.sheet}:${ref.col},${ref.row}`;

/**
 * A tile's registry key: "sheet:col,row". Stacked tiles join their parts bottom to top
 * with "|", each part carrying its flip as "~n" (a stack's own gid is never flipped).
 */
export const refKey = (ref: TileRef): string =>
	ref.parts ? ref.parts.map((p) => simpleKey(p) + (p.flip ? `~${p.flip}` : "")).join("|") : simpleKey(ref);

/** The layers of a registry key, bottom to top, each with its flip (0 for plain keys). */
export function keyParts(key: string): (TileRef & { flip: number })[] | null {
	const parts = key.split("|").map((k) => {
		const [base, flip] = k.split("~");
		const ref = parseKey(base);
		return ref ? { ...ref, flip: Number(flip ?? 0) } : null;
	});
	return parts.every(Boolean) ? (parts as (TileRef & { flip: number })[]) : null;
}

export function parseKey(key: string): TileRef | null {
	// A sheet id, or "sheet#n" for LimeZu single n of that sheet (world/art/singles.ts).
	const m = /^([a-zA-Z0-9]+(?:#[A-Za-z0-9_]+)?):(\d+),(\d+)$/.exec(key);
	return m ? { sheet: m[1], col: Number(m[2]), row: Number(m[3]) } : null;
}

export class TileRegistry {
	readonly tiles: string[];
	private index: Map<string, number>;

	constructor(file?: RegistryFile) {
		this.tiles = file?.tiles.length ? [...file.tiles] : [...RESERVED];
		RESERVED.forEach((r, i) => {
			if (this.tiles[i] !== r) throw new Error(`Tile registry: id ${i} must be "${r}", found "${this.tiles[i]}"`);
		});
		this.index = new Map(this.tiles.map((k, i) => [k, i]));
		if (this.index.size !== this.tiles.length) throw new Error("Tile registry has duplicate entries");
	}

	id(ref: TileRef): number {
		const key = refKey(ref);
		let id = this.index.get(key);
		if (id === undefined) {
			id = this.tiles.length;
			if (id >= ATLAS_CAPACITY) throw new Error(`Tile registry is full (${ATLAS_CAPACITY}); raise ATLAS_CAPACITY`);
			this.tiles.push(key);
			this.index.set(key, id);
		}
		return id;
	}

	toJSON(): RegistryFile {
		return { tiles: this.tiles };
	}
}
