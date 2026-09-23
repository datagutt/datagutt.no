// Stable tile ids for generated maps (docs/game/PLAN.md M3.1). Maps store ids into one
// packed tileset; this registry says which LimeZu tile each id is. It is append-only, so
// committed maps keep meaning the same tiles when new tiles are registered.
import type { TileRef } from "../art/autotile.ts";

/** Ids 0 and 1 are reserved for the collision layers: block and unblock. */
export const RESERVED = ["@collision", "@clear"] as const;
export const COLLISION_ID = 0;
export const CLEAR_ID = 1;

/** The packed tileset has a fixed size so maps don't change when the registry grows. */
export const ATLAS_COLUMNS = 64;
export const ATLAS_CAPACITY = 64 * 64;

export type RegistryFile = { tiles: string[] };

export const refKey = (ref: TileRef) => `${ref.sheet}:${ref.col},${ref.row}`;

export function parseKey(key: string): TileRef | null {
	const m = /^([a-zA-Z0-9]+):(\d+),(\d+)$/.exec(key);
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
