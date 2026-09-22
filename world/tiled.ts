// Writes maps in Tiled's JSON format (.tmj) so Phaser loads them natively and they can
// be opened in Tiled for touch-ups (docs/game/DESIGN.md §10).
import { toTiledObject, type MapObject } from "../game/world/objects.ts";

export type TilesetRef = {
	name: string;
	/** Image path relative to the map file. */
	image: string;
	columns: number;
	tileCount: number;
	tileSize: number;
	/** Tile ids (0-based) that block movement. */
	colliding: number[];
};

export type MapSpec = {
	id: string;
	width: number;
	height: number;
	/** Tile layers, bottom to top, each as rows of legend characters. */
	layers: { name: string; rows: string[] }[];
	objects: MapObject[];
	/** Legend character to 0-based tile id. Characters not in the legend are empty. */
	legend: Record<string, number>;
	properties?: Record<string, string>;
};

export function toTmj(spec: MapSpec, tileset: TilesetRef) {
	const { width, height, tileSize } = { ...spec, tileSize: tileset.tileSize };
	let nextId = 1;

	const layers: object[] = spec.layers.map((layer) => {
		if (layer.rows.length !== height) {
			throw new Error(`${spec.id}/${layer.name}: ${layer.rows.length} rows, expected ${height}`);
		}
		const data: number[] = [];
		layer.rows.forEach((row, y) => {
			const chars = [...row];
			if (chars.length !== width) {
				throw new Error(`${spec.id}/${layer.name} row ${y}: ${chars.length} tiles, expected ${width}`);
			}
			for (const ch of chars) {
				const id = spec.legend[ch];
				data.push(id === undefined ? 0 : id + 1);
			}
		});
		return { id: nextId++, name: layer.name, type: "tilelayer", x: 0, y: 0, width, height, opacity: 1, visible: true, data };
	});

	for (const obj of spec.objects) {
		if (obj.x < 0 || obj.y < 0 || obj.x >= width || obj.y >= height) {
			throw new Error(`${spec.id}: ${obj.type} at (${obj.x}, ${obj.y}) is outside the map`);
		}
	}
	const layerId = nextId++;
	const objects = spec.objects.map((obj, i) => toTiledObject(obj, i + 1, tileSize));
	layers.push({ id: layerId, name: "objects", type: "objectgroup", x: 0, y: 0, opacity: 1, visible: true, draworder: "topdown", objects });

	return {
		type: "map",
		version: "1.10",
		tiledversion: "1.11.0",
		orientation: "orthogonal",
		renderorder: "right-down",
		infinite: false,
		width,
		height,
		tilewidth: tileSize,
		tileheight: tileSize,
		nextlayerid: nextId,
		nextobjectid: objects.length + 1,
		properties: Object.entries(spec.properties ?? {}).map(([name, value]) => ({ name, type: "string", value })),
		layers,
		tilesets: [
			{
				firstgid: 1,
				name: tileset.name,
				image: tileset.image,
				imagewidth: tileset.columns * tileSize,
				imageheight: Math.ceil(tileset.tileCount / tileset.columns) * tileSize,
				tilewidth: tileSize,
				tileheight: tileSize,
				tilecount: tileset.tileCount,
				columns: tileset.columns,
				margin: 0,
				spacing: 0,
				tiles: tileset.colliding.map((id) => ({ id, properties: [{ name: "collides", type: "bool", value: true }] })),
			},
		],
	};
}
