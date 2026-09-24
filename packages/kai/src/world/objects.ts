// Things placed on a map's object layer. The map build writes them as Tiled objects
// (`type` plus custom properties) and the game reads them back. Coordinates are in tiles.
//
// Every type is a descriptor made by defineMapObject(): its properties, its size, and how
// it sits on the map, which the map checks enforce. The engine defines the types it
// handles itself (CORE_OBJECTS). A game or a plugin defines its own the same way; the
// build learns them from the game's maps module (MAP_OBJECTS) and the runtime from the
// plugins that place them.
//
// Ids that name the game's own things (an unlock, an arcade game) are plain strings here:
// the game's build checks them against its registries.
import type { Facing } from "@datagutt/kai-net/protocol";
import type { World } from "../plugins/api.ts";

export type { Facing };

/**
 * A property's kind. A trailing `?` makes it optional: it is left out when empty. `tiles`
 * is a list of tile keys joined with "|" in the map builder, which the map writer turns
 * into comma-separated gids for the game. A property named `id` is kept as the Tiled
 * object's name.
 */
export type PropKind = "string" | "string?" | "number" | "number?" | "bool" | "facing" | "tiles";
export type PropSpec = Readonly<Record<string, PropKind>>;

/**
 * How an object sits on the map, which the map checks enforce:
 * - `standing`: on walkable tiles, which it takes; reached from a side or across a
 *   counter (an NPC, a cat).
 * - `fixture`: on something solid, used from a walkable side (a sign, a cabinet).
 * - `overlay`: over anything, and not checked (an area, a light, a field of crops).
 * - `marker`: the engine's spawns, doors and spots, which have checks of their own.
 */
export type Placement = "standing" | "fixture" | "overlay" | "marker";

/**
 * An object's size. One tile when left out. `{ w, h }` is a fixed footprint from (x, y),
 * such as a cat lying across two tiles; the Tiled object stays one tile. `rect` gives
 * every object its own `w` and `h`, kept as the Tiled object's size. `rect?` does that
 * only when `w` is set (a sign the build grows over what it describes).
 */
export type ObjectSize = { readonly w: number; readonly h: number } | "rect" | "rect?";

/** What every map object has, whatever its type. */
export type AnyMapObject = { readonly type: string; x: number; y: number };

type ValueOf<K extends PropKind> = K extends "number" | "number?" ? number : K extends "bool" ? boolean : K extends "facing" ? Facing : string;
type RequiredProps<S extends PropSpec> = { -readonly [K in keyof S as S[K] extends `${string}?` ? never : K]: ValueOf<S[K]> };
type OptionalProps<S extends PropSpec> = { -readonly [K in keyof S as S[K] extends `${string}?` ? K : never]?: ValueOf<S[K]> };
type RectOf<Z> = Z extends "rect" ? { w: number; h: number } : Z extends "rect?" ? { w?: number; h?: number } : unknown;
type Flatten<T> = { [K in keyof T]: T[K] } & {};

/** The object a descriptor with these properties and this size describes. */
export type ObjectFrom<T extends string, S extends PropSpec, Z> = Flatten<{ type: T; x: number; y: number } & RectOf<Z> & RequiredProps<S> & OptionalProps<S>>;

/** A map object type and what a plugin does with each object of it as the map loads. */
export type ObjectPlacer = { readonly type: MapObjectType; place(world: World, obj: AnyMapObject): void };

export interface MapObjectType<O extends AnyMapObject = AnyMapObject> {
	readonly type: O["type"];
	readonly placement: Placement;
	readonly size?: ObjectSize;
	/** Property kinds by name, where the writer needs them (`tiles`). */
	readonly props: PropSpec;
	/** Reads a Tiled object of this type back, or explains what is wrong with it. */
	parse(obj: TiledObject, tileSize: number): O;
	is(obj: AnyMapObject): obj is O;
	/** An object of this type at (x, y), for map builders. */
	at(x: number, y: number, props: Omit<O, "type" | "x" | "y">): O;
	/** For a plugin's `objects`: `fn` runs for each object of this type as the map loads. */
	place(fn: (world: World, obj: O) => void): ObjectPlacer;
}

export type MapObjectOf<D> = D extends MapObjectType<infer O> ? O : never;

/** Reads a Tiled object's properties by kind, for types that read their own. */
export type PropReader = {
	string(name: string): string;
	optionalString(name: string): string | undefined;
	number(name: string): number;
	facing(name: string): Facing;
	raw(name: string): string | number | boolean | undefined;
};

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

function reader(obj: TiledObject): PropReader {
	const props = new Map((obj.properties ?? []).map((p) => [p.name, p.value]));
	const string = (name: string): string => {
		const v = props.get(name);
		if (typeof v !== "string" || v === "") throw new Error(`${obj.type} object ${obj.id} needs a "${name}" string property`);
		return v;
	};
	return {
		string,
		optionalString: (name) => {
			const v = props.get(name);
			return typeof v === "string" && v !== "" ? v : undefined;
		},
		number: (name) => {
			const v = Number(props.get(name));
			if (!Number.isFinite(v)) throw new Error(`${obj.type} object ${obj.id} needs a numeric "${name}"`);
			return v;
		},
		facing: (name) => {
			const v = string(name);
			if (!FACINGS.includes(v as Facing)) throw new Error(`${obj.type} object ${obj.id} has invalid facing "${v}"`);
			return v as Facing;
		},
		raw: (name) => props.get(name),
	};
}

function readProps(obj: TiledObject, spec: PropSpec, read: PropReader): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [name, kind] of Object.entries(spec)) {
		if (name === "id") out.id = obj.name || read.string("id");
		else if (kind === "string" || kind === "tiles") out[name] = read.string(name);
		else if (kind === "string?") {
			const v = read.optionalString(name);
			if (v !== undefined) out[name] = v;
		} else if (kind === "number") out[name] = read.number(name);
		else if (kind === "number?") {
			if (read.raw(name) !== undefined) out[name] = read.number(name);
		} else if (kind === "bool") out[name] = read.raw(name) === "true";
		else out[name] = read.facing(name);
	}
	return out;
}

type Options = { readonly placement: Placement; readonly size?: ObjectSize };

/** A map object type whose properties follow `props`. */
export function defineMapObject<const T extends string, const S extends PropSpec = Record<never, PropKind>, const Z extends ObjectSize | undefined = undefined>(
	type: T,
	options: Options & { readonly props?: S; readonly size?: Z },
): MapObjectType<ObjectFrom<T, S, Z>>;
/** A map object type that reads its own properties, for shapes a property list can't say (a light's). */
export function defineMapObject<O extends AnyMapObject>(
	type: O["type"],
	options: Options & { readonly props?: PropSpec; read(props: PropReader, obj: TiledObject): Omit<O, "type" | "x" | "y"> },
): MapObjectType<O>;
export function defineMapObject(
	type: string,
	options: Options & { readonly props?: PropSpec; read?(props: PropReader, obj: TiledObject): Record<string, unknown> },
): MapObjectType {
	const { placement, size } = options;
	const spec = options.props ?? {};
	const descriptor: MapObjectType = {
		type,
		placement,
		size,
		props: spec,
		parse(obj, tileSize) {
			const read = reader(obj);
			const w = Math.round(obj.width / tileSize);
			const h = Math.round(obj.height / tileSize);
			const rect = size === "rect" || (size === "rect?" && (w > 1 || h > 1)) ? { w, h } : {};
			const props = options.read ? options.read(read, obj) : readProps(obj, spec, read);
			return { type, x: Math.floor(obj.x / tileSize), y: Math.floor(obj.y / tileSize), ...rect, ...props };
		},
		is: (obj): obj is AnyMapObject => obj.type === type,
		at: (x, y, props) => ({ type, x, y, ...props }),
		place: (fn) => ({ type: descriptor, place: fn }),
	};
	return descriptor;
}

export const spawnObject = defineMapObject("spawn", { props: { id: "string", facing: "facing" }, placement: "marker" });

/** A warp to another map. With `unlock`, it stays shut (and solid) until that holds. */
export const doorObject = defineMapObject("door", { props: { toMap: "string", toSpawn: "string", unlock: "string?" }, placement: "marker" });

/**
 * A readable thing: fixed `text`, or an Ink knot (`dialogue`) for live content. The map
 * build grows it over the object it describes (kai-worldgen signs.ts): then (x, y) is the
 * corner of a w×h rectangle, read from any blocked tile inside it.
 */
export const signObject = defineMapObject("sign", { props: { text: "string", dialogue: "string?" }, placement: "fixture", size: "rect?" });

export const npcObject = defineMapObject("npc", {
	props: { id: "string", character: "string", facing: "facing", name: "string", dialogue: "string" },
	placement: "standing",
});

/** A way that stays shut until `unlock` holds: the w×h rectangle's barriers block it and read `text`; once open, they are cleared away. */
export const gateObject = defineMapObject("gate", { props: { id: "string", unlock: "string", text: "string" }, placement: "overlay", size: "rect" });

/** A named place an NPC who moves between maps can be, facing a way: a live NPC goes to the spot its presence picks. */
export const spotObject = defineMapObject("spot", { props: { id: "string", facing: "facing" }, placement: "marker" });

/** A named rectangle of the map for scripted scenes, such as the ferry for an intro. */
export const areaObject = defineMapObject("area", { props: { id: "string" }, placement: "overlay", size: "rect" });

export type LightTime = "day" | "night";

/**
 * A light, drawn additively over the map and characters. A glow is centred on its tile
 * with a radius in tiles; a beam covers w×h tiles from its tile. `color` is rrggbb,
 * `intensity` 0..1. `when` ties it to the visitor's clock: "day" for daylight through a
 * window, "night" for street lamps and porch lights; always on without.
 */
export type LightObject =
	| { type: "light"; shape: "glow"; x: number; y: number; radius: number; color: string; intensity: number; flicker: boolean; when?: LightTime }
	| { type: "light"; shape: "beam"; x: number; y: number; w: number; h: number; color: string; intensity: number; when?: LightTime };

export const lightObject = defineMapObject<LightObject>("light", {
	placement: "overlay",
	read(props, obj) {
		const shape = props.string("shape");
		const when = props.raw("when");
		if (when !== undefined && when !== "day" && when !== "night") throw new Error(`light object ${obj.id} has invalid when "${when}"`);
		const timed = when ? { when: when as LightTime } : {};
		const color = props.string("color");
		const intensity = props.number("intensity");
		if (shape === "glow") return { shape, radius: props.number("radius"), color, intensity, flicker: props.raw("flicker") === "true", ...timed };
		if (shape === "beam") return { shape, w: props.number("w"), h: props.number("h"), color, intensity, ...timed };
		throw new Error(`light object ${obj.id} has unknown shape "${shape}"`);
	},
});

export type SpawnObject = MapObjectOf<typeof spawnObject>;
export type DoorObject = MapObjectOf<typeof doorObject>;
export type SignObject = MapObjectOf<typeof signObject>;
export type NpcObject = MapObjectOf<typeof npcObject>;
export type GateObject = MapObjectOf<typeof gateObject>;
export type SpotObject = MapObjectOf<typeof spotObject>;
export type AreaObject = MapObjectOf<typeof areaObject>;

/** The types the engine handles itself. */
export const CORE_OBJECTS: readonly MapObjectType[] = [spawnObject, doorObject, signObject, npcObject, gateObject, spotObject, areaObject, lightObject];

/** One of the engine's own map objects. */
export type MapObject = SpawnObject | DoorObject | SignObject | NpcObject | GateObject | SpotObject | AreaObject | LightObject;

export type MapObjectTypes = ReadonlyMap<string, MapObjectType>;

/** The engine's types plus a game's own, by type. */
export function mapObjectTypes(extra: readonly MapObjectType[] = []): MapObjectTypes {
	const types = new Map<string, MapObjectType>();
	for (const descriptor of [...CORE_OBJECTS, ...extra]) {
		const known = types.get(descriptor.type);
		if (known && known !== descriptor) throw new Error(`Two map object types are called "${descriptor.type}"`);
		types.set(descriptor.type, descriptor);
	}
	return types;
}

const CORE_TYPES = mapObjectTypes();

function descriptorFor(type: string, types: MapObjectTypes, where: string): MapObjectType {
	const descriptor = types.get(type);
	if (!descriptor) throw new Error(`Unknown map object type "${type}" (${where}). Define it with defineMapObject and list it in the maps module's MAP_OBJECTS.`);
	return descriptor;
}

/** Reads a Tiled object back by its type's descriptor, or explains what is wrong with it. */
export function parseMapObject(obj: TiledObject, tileSize: number, types: MapObjectTypes = CORE_TYPES): AnyMapObject {
	return descriptorFor(obj.type, types, `object ${obj.id}`).parse(obj, tileSize);
}

/** The reverse of parseMapObject, used by the map build. */
export function toTiledObject(obj: AnyMapObject, id: number, tileSize: number, types: MapObjectTypes = CORE_TYPES): TiledObject {
	const { size } = descriptorFor(obj.type, types, `at (${obj.x}, ${obj.y})`);
	const { type, x, y, ...rest } = obj as AnyMapObject & Record<string, unknown>;
	const objectName = typeof rest.id === "string" ? rest.id : "";
	// Rectangles keep their size as the Tiled object's width and height.
	const area = size === "rect" || (size === "rect?" && rest.w !== undefined) ? { w: rest.w as number, h: rest.h as number } : null;
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

/** The tiles an object stands on: its fixed footprint, or its own tile. */
export function footprintOf(obj: AnyMapObject, descriptor: MapObjectType): [number, number][] {
	const size = descriptor.size;
	if (typeof size !== "object") return [[obj.x, obj.y]];
	const cells: [number, number][] = [];
	for (let y = obj.y; y < obj.y + size.h; y++) for (let x = obj.x; x < obj.x + size.w; x++) cells.push([x, y]);
	return cells;
}
