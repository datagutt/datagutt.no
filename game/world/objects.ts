// Things placed on a map's object layer. The map build writes them as Tiled objects
// (`type` plus custom properties) and the game reads them back with parseMapObject().
// Coordinates are in tiles.

export type Facing = "right" | "up" | "left" | "down";

export type MapObject =
	| { type: "spawn"; id: string; x: number; y: number; facing: Facing }
	| { type: "door"; x: number; y: number; toMap: string; toSpawn: string }
	| { type: "sign"; x: number; y: number; text: string }
	| { type: "npc"; id: string; character: string; x: number; y: number; facing: Facing; text: string };

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
		case "sign":
			return { type: "sign", x, y, text: str("text") };
		case "npc":
			return { type: "npc", id: obj.name || str("id"), character: str("character"), x, y, facing: facing(), text: str("text") };
		default:
			throw new Error(`Unknown map object type "${obj.type}" (object ${obj.id})`);
	}
}

/** The reverse of parseMapObject, used by the map build. */
export function toTiledObject(obj: MapObject, id: number, tileSize: number): TiledObject {
	const { type, x, y, ...rest } = obj;
	const name = "id" in rest ? rest.id : "";
	const properties: TiledProperty[] = Object.entries(rest)
		.filter(([key]) => key !== "id")
		.map(([key, value]) => ({ name: key, type: "string", value: String(value) }));
	return {
		id,
		name,
		type,
		x: x * tileSize,
		y: y * tileSize,
		width: tileSize,
		height: tileSize,
		rotation: 0,
		visible: true,
		...(properties.length ? { properties } : {}),
	};
}
