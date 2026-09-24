// Writes a generated MapCanvas as a Tiled map (.tmj). Generated layers are rewritten on
// every run; layers named `manual_*` in the previous file are the user's touch-ups in
// Tiled and are carried over untouched, after the generated layers.
import { mapObjectTypes, toTiledObject, type MapObjectTypes } from "@datagutt/kai/world/objects";
import { CHANGED_SEASONS, formatSeasonTable, seasonProperty, type ChangedSeason } from "@datagutt/kai/world/season";
import type { TileRef } from "./autotile.ts";
import { FLIP, LAYER_BLEND, LAYERS, type MapCanvas } from "./canvas.ts";
import { ATLAS_CAPACITY, ATLAS_COLUMNS, CLEAR_ID, COLLISION_ID, parseKey, type TileRegistry } from "./registry.ts";
import { growSigns } from "./signs.ts";

const TILE = 16;
export const WORLD_TILESET = "world";

type TmjLayer = { name: string; type: string; width?: number; height?: number; [key: string]: unknown };
export type Tmj = { width: number; height: number; layers: TmjLayer[]; [key: string]: unknown };

/** Tiled keeps a tile's transform in the top three bits of its gid. */
export const GID_H = 0x80000000;
export const GID_V = 0x40000000;
export const GID_D = 0x20000000;
const flipBits = (flip: number) => (flip & FLIP.H ? GID_H : 0) + (flip & FLIP.V ? GID_V : 0) + (flip & FLIP.D ? GID_D : 0);

/** Split a gid into its tile id (0 = empty) and TileRef-style flip bits. */
export function decodeGid(gid: number): { gid: number; flip: number } {
	const flip = (gid >= GID_H ? FLIP.H : 0) | ((gid % GID_H) >= GID_V ? FLIP.V : 0) | ((gid % GID_V) >= GID_D ? FLIP.D : 0);
	return { gid: gid % GID_D, flip };
}

export const isManual = (layer: { name: string }) => layer.name.startsWith("manual_");

/**
 * An art adapter's rule for one tile (not a stack) in another season: the tile to show
 * instead, the same tile when it does not change, or null when the season clears it.
 */
export type SeasonalTiles = (ref: TileRef, season: ChangedSeason) => TileRef | null;

export function canvasToTmj(
	id: string,
	canvas: MapCanvas,
	registry: TileRegistry,
	options: {
		properties?: Record<string, string>;
		previous?: Tmj | null;
		seasonal?: SeasonalTiles;
		/** The engine's map object types and the game's own (its MAP_OBJECTS). */
		types?: MapObjectTypes;
	} = {},
): Tmj {
	const { width, height } = canvas;
	const gid = (tileId: number) => tileId + 1;
	const layers: TmjLayer[] = [];
	const tileLayer = (name: string, data: number[], visible = true): TmjLayer => ({
		id: 0,
		name,
		type: "tilelayer",
		x: 0,
		y: 0,
		width,
		height,
		opacity: 1,
		visible,
		data,
	});

	for (const name of LAYERS) {
		const data = canvas.layers[name].map((ref) => (ref ? gid(registry.id(ref)) + flipBits(ref.flip ?? 0) : 0));
		const layer = tileLayer(name, data);
		// The game reads the blend mode from this property (Tiled shows it too).
		const blend = LAYER_BLEND[name];
		if (blend) layer.properties = [{ name: "blend", type: "string", value: blend }];
		layers.push(layer);
	}
	const properties = { ...options.properties, ...(options.seasonal ? seasonTables(canvas, registry, options.seasonal) : {}) };
	layers.push(tileLayer("collision", [...canvas.collision].map((b) => (b ? gid(COLLISION_ID) : 0)), false));
	const water = waterCells(canvas);
	if (water.some(Boolean)) layers.push(tileLayer(WATER_LAYER, water.map((w) => (w === "open" ? gid(COLLISION_ID) : w === "covered" ? gid(CLEAR_ID) : 0)), false));
	if (canvas.forest.some(Boolean)) layers.push(tileLayer(FOREST_LAYER, [...canvas.forest].map((f) => (f ? gid(COLLISION_ID) : 0)), false));

	for (const obj of canvas.objects) {
		if (!canvas.inBounds(obj.x, obj.y)) throw new Error(`${id}: ${obj.type} at (${obj.x}, ${obj.y}) is outside the map`);
	}
	const types = options.types ?? mapObjectTypes();
	growSigns(canvas, types);
	// `tiles` properties are tile keys in the generator and gids in the map.
	const resolved = canvas.objects.map((obj) => {
		const tileProps = Object.entries(types.get(obj.type)?.props ?? {}).filter(([, kind]) => kind === "tiles");
		if (!tileProps.length) return obj;
		const out: Record<string, unknown> = { ...obj };
		for (const [name] of tileProps) {
			out[name] = String(out[name])
				.split("|")
				.map((k) => String(registry.id(parseKey(k)!) + 1))
				.join(",");
		}
		return out as typeof obj;
	});
	const objects = resolved.map((obj, i) => toTiledObject(obj, i + 1, TILE, types));
	layers.push({ id: 0, name: "objects", type: "objectgroup", x: 0, y: 0, opacity: 1, visible: true, draworder: "topdown", objects });

	let nextObjectId = objects.length + 1;
	for (const layer of options.previous?.layers.filter(isManual) ?? []) {
		if (layer.type === "tilelayer" && (layer.width !== width || layer.height !== height)) {
			throw new Error(
				`${id}: manual layer "${layer.name}" is ${layer.width}×${layer.height} but the map is now ${width}×${height}. ` +
					"Resize it in Tiled or move its edits into the generator.",
			);
		}
		if (layer.type === "objectgroup") {
			// Object ids must be unique across the map; renumber the manual ones after ours.
			const objs = (layer.objects as { id: number }[]).map((o) => ({ ...o, id: nextObjectId++ }));
			layers.push({ ...layer, objects: objs });
		} else {
			layers.push({ ...layer });
		}
	}
	layers.forEach((layer, i) => (layer.id = i + 1));

	return {
		type: "map",
		version: "1.10",
		tiledversion: "1.11.0",
		orientation: "orthogonal",
		renderorder: "right-down",
		infinite: false,
		width,
		height,
		tilewidth: TILE,
		tileheight: TILE,
		nextlayerid: layers.length + 1,
		nextobjectid: nextObjectId,
		properties: Object.entries(properties).map(([name, value]) => ({ name, type: "string", value })),
		layers,
		tilesets: [
			{
				firstgid: 1,
				name: WORLD_TILESET,
				image: "../tilesets/world.png",
				imagewidth: ATLAS_COLUMNS * TILE,
				imageheight: (ATLAS_CAPACITY / ATLAS_COLUMNS) * TILE,
				tilewidth: TILE,
				tileheight: TILE,
				tilecount: ATLAS_CAPACITY,
				columns: ATLAS_COLUMNS,
				margin: 0,
				spacing: 0,
				tiles: [
					{ id: COLLISION_ID, properties: [{ name: "collides", type: "bool", value: true }] },
					{ id: CLEAR_ID, properties: [{ name: "clears", type: "bool", value: true }] },
				],
			},
		],
	};
}

/**
 * Hidden layer for the water shader (game/fx/Water.ts), reusing the two reserved tiles:
 * the collision tile marks open water, the clear tile sea with something over it.
 */
export const WATER_LAYER = "water";
/** Hidden layer marking forest cells for the ambience (game/audio/Ambience.ts). */
export const FOREST_LAYER = "forest";
const WATER_SHEETS = new Set(["sea", "seaCorners"]);

/**
 * Sea cells: "open", or "covered" by a pier or boat, where the shader draws nothing but
 * which still count as sea, so foam forms only against the shore.
 */
function waterCells(canvas: MapCanvas): ("open" | "covered" | null)[] {
	const isSea = (ref: TileRef | null) => Boolean(ref && (ref.parts ?? [ref]).some((p) => WATER_SHEETS.has(p.sheet)));
	return canvas.layers.decal.map((ref, i) => (!isSea(ref) ? null : canvas.layers.below[i] || canvas.layers.above[i] ? "covered" : "open"));
}

/**
 * For each season but summer, which tiles of the map become which, as map properties
 * the game applies on load (@datagutt/kai/world/season). Registers the seasonal tiles.
 */
function seasonTables(canvas: MapCanvas, registry: TileRegistry, seasonalTile: SeasonalTiles): Record<string, string> {
	const out: Record<string, string> = {};
	for (const season of CHANGED_SEASONS) {
		const table = new Map<number, number>();
		for (const name of LAYERS) {
			for (const ref of canvas.layers[name]) {
				if (!ref) continue;
				const from = registry.id(ref) + 1;
				if (table.has(from)) continue;
				let to: TileRef | null;
				if (ref.parts) {
					// A stack keeps its own flip (none) and its parts keep theirs.
					const parts = ref.parts.map((p) => seasonalTile(p, season)).filter((p): p is TileRef => p !== null);
					to = parts.length ? { ...ref, parts } : null;
				} else {
					to = seasonalTile(ref, season);
				}
				const toId = to ? registry.id(to) + 1 : 0;
				if (toId !== from) table.set(from, toId);
			}
		}
		if (table.size) out[seasonProperty(season)] = formatSeasonTable(table);
	}
	return out;
}

/**
 * Stable, diff-friendly JSON: two-space indents, but each tile layer's data is written
 * one map row per line instead of one number per line.
 */
export function formatTmj(tmj: Tmj): string {
	const rows = new Map<string, string>();
	const replaced = {
		...tmj,
		layers: tmj.layers.map((layer, i) => {
			if (!Array.isArray(layer.data)) return layer;
			const token = `@@data${i}@@`;
			const data = layer.data as number[];
			const w = layer.width ?? tmj.width;
			const lines: string[] = [];
			for (let y = 0; y < data.length; y += w) lines.push(data.slice(y, y + w).join(","));
			rows.set(token, lines.join(",\n        "));
			return { ...layer, data: token };
		}),
	};
	let text = JSON.stringify(replaced, null, 2);
	for (const [token, body] of rows) text = text.replace(`"${token}"`, `[\n        ${body}\n      ]`);
	return text + "\n";
}
