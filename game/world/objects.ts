// Things placed on a map's object layer. The map build writes them as Tiled objects
// (`type` plus custom properties) and the game reads them back with parseMapObject().
// Coordinates are in tiles.

export type Facing = "right" | "up" | "left" | "down";

export type MapObject =
	| { type: "spawn"; id: string; x: number; y: number; facing: Facing }
	| { type: "door"; x: number; y: number; toMap: string; toSpawn: string }
	/** A readable thing: fixed `text`, or an Ink knot (`dialogue`) for live content. */
	| { type: "sign"; x: number; y: number; text: string; dialogue?: string }
	| { type: "npc"; id: string; character: string; x: number; y: number; facing: Facing; name: string; dialogue: string }
	| LightObject
	/**
	 * Live content drawn by the game from the WorldState (M3.11): `crops` is the farm field
	 * (one tile per day; `stages` lists the growth-stage tiles as gids, smallest first),
	 * `books` the library's featured shelf (one spine per pinned repo).
	 */
	| { type: "crops"; x: number; y: number; w: number; h: number; stages: string }
	| { type: "books"; x: number; y: number; w: number; h: number };

/**
 * A light, drawn additively over the map and characters (game/fx/Lights.ts). A glow is
 * centred on its tile with a radius in tiles; a beam covers w×h tiles from its tile.
 * `color` is rrggbb, `intensity` 0..1.
 */
export type LightObject =
	| { type: "light"; shape: "glow"; x: number; y: number; radius: number; color: string; intensity: number; flicker: boolean }
	| { type: "light"; shape: "beam"; x: number; y: number; w: number; h: number; color: string; intensity: number };

export type TiledProperty = { name: string; type: "string" | "int" | "bool"; value: string | number | boolean };

export type TiledObject = {
	id: number;
	name: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	visible: boolean;
	properties?: TiledProperty[];
};

const FACINGS: readonly Facing[] = ["right", "up", "left", "down"];

/** Reads a Tiled object back into a MapObject, or explains what is wrong with it. */
export function parseMapObject(obj: TiledObject, tileSize: number): MapObject {
	const props = new Map((obj.properties ?? []).map((p) => [p.name, p.value]));
	const str = (name: string): string => {
		const v = props.get(name);
		if (typeof v !== "string" || v === "") throw new Error(`${obj.type} object ${obj.id} needs a "${name}" string property`);
		return v;
	};
	const facing = (): Facing => {
		const v = str("facing");
		if (!FACINGS.includes(v as Facing)) throw new Error(`${obj.type} object ${obj.id} has invalid facing "${v}"`);
		return v as Facing;
	};
	const x = Math.floor(obj.x / tileSize);
	const y = Math.floor(obj.y / tileSize);

	switch (obj.type) {
		case "spawn":
			return { type: "spawn", id: obj.name || str("id"), x, y, facing: facing() };
		case "door":
			return { type: "door", x, y, toMap: str("toMap"), toSpawn: str("toSpawn") };
		case "sign": {
			const dialogue = props.get("dialogue");
			return { type: "sign", x, y, text: str("text"), ...(typeof dialogue === "string" && dialogue ? { dialogue } : {}) };
		}
		case "npc":
			return { type: "npc", id: obj.name || str("id"), character: str("character"), x, y, facing: facing(), name: str("name"), dialogue: str("dialogue") };
		case "crops":
			return { type: "crops", x, y, w: Math.round(obj.width / tileSize), h: Math.round(obj.height / tileSize), stages: str("stages") };
		case "books":
			return { type: "books", x, y, w: Math.round(obj.width / tileSize), h: Math.round(obj.height / tileSize) };
		case "light": {
			const num = (name: string) => {
				const v = Number(props.get(name));
				if (!Number.isFinite(v)) throw new Error(`light object ${obj.id} needs a numeric "${name}"`);
				return v;
			};
			const shape = str("shape");
			if (shape === "glow") return { type: "light", shape, x, y, radius: num("radius"), color: str("color"), intensity: num("intensity"), flicker: props.get("flicker") === "true" };
			if (shape === "beam") return { type: "light", shape, x, y, w: num("w"), h: num("h"), color: str("color"), intensity: num("intensity") };
			throw new Error(`light object ${obj.id} has unknown shape "${shape}"`);
		}
		default:
			throw new Error(`Unknown map object type "${obj.type}" (object ${obj.id})`);
	}
}

/** The reverse of parseMapObject, used by the map build. */
export function toTiledObject(obj: MapObject, id: number, tileSize: number): TiledObject {
	const { type, x, y, ...rest } = obj;
	const objectName = "id" in rest ? rest.id : "";
	// Areas (crops, books) keep their size as the Tiled object's width and height.
	const area = type === "crops" || type === "books" ? (rest as { w: number; h: number }) : null;
	const properties: TiledProperty[] = Object.entries(rest)
		.filter(([key]) => key !== "id" && !(area && (key === "w" || key === "h")))
		.map(([key, value]) => ({ name: key, type: "string", value: String(value) }));
	return {
		id,
		name: objectName,
		type,
		x: x * tileSize,
		y: y * tileSize,
		width: area ? area.w * tileSize : tileSize,
		height: area ? area.h * tileSize : tileSize,
		rotation: 0,
		visible: true,
		...(properties.length ? { properties } : {}),
	};
}
