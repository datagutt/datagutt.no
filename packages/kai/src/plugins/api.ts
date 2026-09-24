// The plugin API: how a game adds its own behaviour to the engine's world without the
// engine knowing about it. A plugin reacts to the world (a map loading, the player using
// something, a conversation ending), places its own map object types, adds start menu
// items, and can take over the frame for a while (a cutscene, a cabinet, the credits).
import type Phaser from "phaser";
import type { MapObject } from "../world/objects.ts";
import type { Externals, ExternalsContext, GameServices, WorldTarget } from "../boot.ts";
import type { Actor } from "../entities/Actor.ts";
import type { FrameInput } from "../input/InputController.ts";
import type { Progress } from "../progress/Progress.ts";
import type { PromptAction } from "../ui/Prompt.ts";
import type { CollisionGrid, Point } from "../world/grid.ts";
import type { Daylight } from "../world/dayNight.ts";

export type ObjectOf<T extends MapObject["type"]> = Extract<MapObject, { type: T }>;
export type NpcDef = ObjectOf<"npc">;
export type TileLayer = Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

/** The running world, as a plugin sees it. One lives for as long as the player is on a map. */
export interface World {
	readonly scene: Phaser.Scene;
	/** The current map's id. */
	readonly map: string;
	readonly outdoors: boolean;
	readonly grid: CollisionGrid;
	readonly player: Actor;
	readonly services: GameServices;
	readonly progress: Progress;
	readonly daylight: Daylight;
	/** The map's tile layers by name ("ground", "decal", "below", "above", ...). */
	readonly layers: ReadonlyMap<string, TileLayer>;
	readonly spawns: ReadonlyMap<string, ObjectOf<"spawn">>;
	readonly spots: ReadonlyMap<string, ObjectOf<"spot">>;
	readonly areas: ReadonlyMap<string, ObjectOf<"area">>;
	/** Doors by tile ("x,y"). */
	readonly doors: ReadonlyMap<string, ObjectOf<"door">>;
	/** Where the player arrived on this map. */
	readonly arrival: { target: WorldTarget; tile: Point };
	readonly dialogueOpen: boolean;

	/**
	 * Make an NPC talkable like one from the map. A `managed` NPC is moved and synced by
	 * its plugin; the world leaves its actor alone.
	 */
	addNpc(def: NpcDef, actor: Actor, options?: { managed?: boolean }): void;
	removeNpc(id: string): void;
	npc(id: string): { actor: Actor; def: NpcDef } | undefined;
	/** The NPC the interaction prompt is over, if any. */
	readonly promptNpc: string | null;

	/** Plays an Ink knot to its end: spoken by `npc` (portrait, name, voice), or narrated. */
	playKnot(knot: string, npc: NpcDef | null, onEnd: () => void): void;
	/** Earn an achievement once: a banner (unless `announce` is false) and a save. */
	achieve(id: string, announce?: boolean): void;
	save(): void;
	/** Fade out and restart the world on another map (or spot). */
	goTo(target: WorldTarget, fadeMs?: number): void;
	/** Hand the frame to `takeover` until its update returns false. */
	takeOver(takeover: Takeover): void;
	clearPath(): void;
	/** Run `fn` when the world shuts down (leaving the map). */
	onShutdown(fn: () => void): void;
}

/** Something that has the frame for a while: the world stops walking and talking meanwhile. */
export type Takeover = {
	/** For the ?debug readout ("intro", "credits", or a cabinet's title). */
	readonly name: string;
	/** One frame. Return false when done. */
	update(dt: number, input: FrameInput): boolean;
	/** Keep map NPCs animating while it runs. */
	readonly syncNpcs?: boolean;
	/** Play the playlist's credits track meanwhile. */
	readonly music?: "credits";
};

/** Something the player can use on a tile: the prompt to show over it, and what using it does. */
export type Usable = { prompt: PromptAction; use(): void };

/** A start menu item: an action, or a page of text (its id names the menu view). */
export type MenuItem = { id: string; label: string } & ({ run(): void } | { title: string; lines(): string[] });

export interface KaiPlugin {
	readonly name: string;
	/**
	 * Once, as the game boots, before anything loads. It may change where the game starts
	 * (`services.start`); `start: true` then skips the title. `stop` runs when the game ends.
	 */
	boot?(services: GameServices, params: URLSearchParams): { start?: boolean; stop?: () => void } | void;
	/** Ink external functions this plugin implements, bound beside the game's own. */
	externals?(ctx: ExternalsContext): Externals;
	/** Map object types this plugin places, by `type`: called for each as the map loads. */
	readonly objects?: Partial<{ [T in MapObject["type"]]: (world: World, obj: ObjectOf<T>) => void }>;
	/** After the map, its objects and the player are in place. */
	mapCreated?(world: World): void;
	/** What the player can use on `tile`, asked before signs and doors. */
	usableAt?(world: World, tile: Point): Usable | null;
	/** The prompt over an NPC, instead of "Talk". */
	promptFor?(world: World, npc: NpcDef): PromptAction | null;
	/** Talking to `npc`: return true when this plugin plays the conversation itself. */
	talk?(world: World, npc: NpcDef): boolean;
	/** A conversation ended; `reachedOwnKnot` says whether it reached the NPC's own knot. */
	talked?(world: World, npc: NpcDef, knot: string, reachedOwnKnot: boolean): void;
	/** A passport stamp was earned; `complete` when it was the last one. */
	stamped?(world: World, place: string, complete: boolean): void;
	/** The player walked into the edge of the map. */
	bumpedEdge?(world: World): void;
	/** Every frame the world runs freely (no takeover, menu or dialogue). */
	update?(world: World, dt: number, time: number): void;
	/** Start menu items, after the Passport. */
	menuItems?(world: World): MenuItem[];
	/** Extra fields for the ?debug state (window.__kai). */
	debug?(world: World): Record<string, unknown>;
}

/**
 * State a plugin keeps for one visit to a map: `state(world)` makes it on first use and
 * forgets it when the player leaves (a new World comes with every map).
 */
export function perWorld<T>(make: (world: World) => T): (world: World) => T {
	const states = new WeakMap<World, T>();
	return (world) => {
		let state = states.get(world);
		if (state === undefined) states.set(world, (state = make(world)));
		return state;
	};
}

export const tileKey = (p: Point) => `${p.x},${p.y}`;
