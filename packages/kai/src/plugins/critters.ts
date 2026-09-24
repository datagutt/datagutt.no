// Animals among the map's sprites (kai.json `critters`): they get away when the player
// comes close and come back once the player has gone. A crow flaps up and flies off out
// of sight, a gull waddles a few tiles along the ground, a butterfly drifts off in a
// wavy line. With reduced motion they stay where they are.
import type Phaser from "phaser";
import { ABOVE_DEPTH, TILE } from "../constants.ts";
import type { KaiConfig } from "../schema/config.ts";
import type { SpriteObject } from "../world/objects.ts";
import { perWorld, type KaiPlugin, type World } from "./api.ts";

export type Critter = KaiConfig["critters"][string];
export type Side = "left" | "right";

/** How close the player may come, in tiles, before a critter goes. */
export const SCARE_TILES = 2.5;
/** How far from its place the player must be, in tiles, before it comes back. */
export const CALM_TILES = 7;
/** It keeps away at least this long, in ms. */
export const AWAY_MS = 10_000;
/** A flight: how far across and up, in tiles, and how long it takes. */
const FLIGHT = { across: 10, up: 6, ms: 2000 };
const HOP_MS = 200;
const WADDLE_TILES = 3;
const DRIFT = { tiles: 3, ms: 1400 };

type Point = { x: number; y: number };

type State = {
	readonly def: SpriteObject;
	readonly sprite: Phaser.GameObjects.Sprite;
	readonly critter: Critter;
	/** Its place on the map: the sprite's top-left at rest, and where its feet are then. */
	readonly home: Point;
	readonly rest: Point;
	facing: Side;
	mode: "home" | "moving" | "aside" | "away";
	/** Scene time the critter left its place. */
	leftAt: number;
	/** The side it fled to, which a bird that flew off comes back from. */
	fledTo: Side;
};

/** Away from the player: a critter right of them (or level with them) goes right. */
export const sideAway = (critterX: number, playerX: number): Side => (critterX >= playerX ? "right" : "left");
const opposite = (side: Side): Side => (side === "left" ? "right" : "left");
const sign = (side: Side) => (side === "right" ? 1 : -1);

/** Where a critter stands: the middle of its frame's bottom edge. */
const feet = (sprite: Phaser.GameObjects.Sprite): Point => ({ x: sprite.x + sprite.width / 2, y: sprite.y + sprite.height });
const tilesBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) / TILE;

/** How many tiles a waddling critter can go towards `side` from `tile`, up to `max`. */
export function waddleRoom(tile: Point, side: Side, walkable: (x: number, y: number) => boolean, max = WADDLE_TILES): number {
	let steps = 0;
	while (steps < max && walkable(tile.x + sign(side) * (steps + 1), tile.y)) steps++;
	return steps;
}

export function crittersPlugin(critters: KaiConfig["critters"]): KaiPlugin {
	// Each strip name to its species, so a map's sprite finds how it behaves.
	const bySprite = new Map<string, Critter>();
	for (const critter of Object.values(critters)) for (const name of [critter.idle.left, critter.idle.right]) bySprite.set(name, critter);

	const states = perWorld((world): State[] =>
		world.sprites.flatMap(({ def, sprite }) => {
			const critter = bySprite.get(def.sprite);
			if (!critter) return [];
			const facing: Side = def.sprite === critter.idle.right && def.sprite !== critter.idle.left ? "right" : "left";
			return [{ def, sprite, critter, home: { x: sprite.x, y: sprite.y }, rest: feet(sprite), facing, mode: "home" as const, leftAt: 0, fledTo: facing }];
		}),
	);

	/** Play one of a critter's strips, its feet staying where they are. */
	function show(state: State, strip: string, once = false) {
		const { sprite } = state;
		const at = feet(sprite);
		sprite.play({ key: `sprite:${strip}`, ...(once ? { repeat: 0 } : {}) });
		sprite.setPosition(Math.round(at.x - sprite.width / 2), Math.round(at.y - sprite.height));
	}

	function sortByFeet(state: State) {
		if (!state.def.layer) state.sprite.setDepth(state.sprite.y + state.sprite.height);
	}

	function settle(state: State, mode: "home" | "aside", scene: Phaser.Scene) {
		state.mode = mode;
		show(state, state.critter.idle[state.facing]);
		if (mode === "home") state.sprite.setPosition(state.home.x, state.home.y);
		sortByFeet(state);
		if (mode === "aside") state.leftAt = scene.time.now;
	}

	function flee(world: World, state: State, side: Side) {
		const { scene } = world;
		state.mode = "moving";
		state.facing = side;
		state.fledTo = side;
		state.leftAt = scene.time.now;
		const { critter, sprite } = state;
		if (critter.flee === "fly") {
			const flyOff = () => {
				show(state, critter.move?.[side] ?? critter.idle[side]);
				sprite.setDepth(ABOVE_DEPTH + 1);
				scene.tweens.add({
					targets: sprite,
					x: sprite.x + sign(side) * FLIGHT.across * TILE,
					y: sprite.y - FLIGHT.up * TILE,
					alpha: 0,
					duration: FLIGHT.ms,
					ease: "Sine.easeIn",
					onComplete: () => {
						state.mode = "away";
						state.leftAt = scene.time.now;
					},
				});
			};
			const takeOff = critter.takeOff?.[side];
			if (!takeOff) return flyOff();
			show(state, takeOff, true);
			sprite.once("animationcomplete", flyOff);
			return;
		}
		if (critter.flee === "waddle") {
			const at = feet(sprite);
			const tile = { x: Math.floor(at.x / TILE), y: Math.floor((at.y - 1) / TILE) };
			const walkable = (x: number, y: number) => world.grid.isWalkable(x, y);
			// Cornered on one side, it goes the other way; cornered on both, it stays.
			const [go, steps] = [side, opposite(side)].map((s) => [s, waddleRoom(tile, s, walkable)] as const).find(([, n]) => n > 0) ?? [side, 0];
			state.facing = state.fledTo = go;
			show(state, critter.move?.[go] ?? critter.idle[go]);
			if (!steps) return settle(state, "aside", scene);
			const from = { x: sprite.x, y: sprite.y };
			const hop = { t: 0 };
			scene.tweens.add({
				targets: hop,
				t: 1,
				duration: steps * HOP_MS,
				onUpdate: () => {
					sprite.x = Math.round(from.x + sign(go) * steps * TILE * hop.t);
					sprite.y = Math.round(from.y - Math.abs(Math.sin(hop.t * steps * Math.PI)) * 2);
					sortByFeet(state);
				},
				onComplete: () => settle(state, "aside", scene),
			});
			return;
		}
		// Drifting: off towards `side`, bobbing up and down on the way.
		const from = { x: sprite.x, y: sprite.y };
		const rise = (Math.random() - 0.5) * 2 * TILE;
		const drift = { t: 0 };
		show(state, critter.move?.[side] ?? critter.idle[side]);
		scene.tweens.add({
			targets: drift,
			t: 1,
			duration: DRIFT.ms,
			onUpdate: () => {
				sprite.x = Math.round(from.x + sign(side) * DRIFT.tiles * TILE * drift.t);
				sprite.y = Math.round(from.y + rise * drift.t + Math.sin(drift.t * Math.PI * 4) * 4);
				sortByFeet(state);
			},
			onComplete: () => settle(state, "aside", scene),
		});
	}

	function comeBack(world: World, state: State) {
		const { scene } = world;
		const { critter, sprite, home, rest } = state;
		state.mode = "moving";
		// Back the way it went, facing home.
		const toward = opposite(state.fledTo);
		state.facing = toward;
		if (critter.flee === "fly") {
			show(state, critter.move?.[toward] ?? critter.idle[toward]);
			// The flying frame may be taller than the sitting one: it lands with its feet on the spot.
			const landing = { x: Math.round(rest.x - sprite.width / 2), y: Math.round(rest.y - sprite.height) };
			sprite.setPosition(landing.x + sign(state.fledTo) * FLIGHT.across * TILE, landing.y - FLIGHT.up * TILE).setAlpha(0);
			sprite.setDepth(ABOVE_DEPTH + 1);
			scene.tweens.add({
				targets: sprite,
				x: landing.x,
				y: landing.y,
				alpha: 1,
				duration: FLIGHT.ms,
				ease: "Sine.easeOut",
				onComplete: () => settle(state, "home", scene),
			});
			return;
		}
		show(state, critter.move?.[toward] ?? critter.idle[toward]);
		const from = { x: sprite.x, y: sprite.y };
		const back = { t: 0 };
		const tiles = Math.max(1, Math.round(Math.abs(home.x - from.x) / TILE));
		scene.tweens.add({
			targets: back,
			t: 1,
			duration: critter.flee === "waddle" ? tiles * HOP_MS * 1.5 : DRIFT.ms,
			onUpdate: () => {
				sprite.x = Math.round(from.x + (home.x - from.x) * back.t);
				const bob = critter.flee === "waddle" ? -Math.abs(Math.sin(back.t * tiles * Math.PI)) * 2 : Math.sin(back.t * Math.PI * 4) * 4;
				sprite.y = Math.round(from.y + (home.y - from.y) * back.t + bob);
				sortByFeet(state);
			},
			onComplete: () => settle(state, "home", scene),
		});
	}

	return {
		name: "critters",
		update(world) {
			if (world.progress.reducedMotion) return;
			const player = world.player.mover.tile;
			const playerAt = { x: player.x * TILE + TILE / 2, y: (player.y + 1) * TILE };
			const now = world.scene.time.now;
			for (const state of states(world)) {
				// Out of season or out of the light: nothing to scare.
				if (!state.sprite.visible) continue;
				if (state.mode === "home" || state.mode === "aside") {
					if (tilesBetween(feet(state.sprite), playerAt) < SCARE_TILES) {
						flee(world, state, sideAway(feet(state.sprite).x, playerAt.x));
						continue;
					}
				}
				if ((state.mode === "aside" || state.mode === "away") && now - state.leftAt >= AWAY_MS && tilesBetween(state.rest, playerAt) >= CALM_TILES) {
					comeBack(world, state);
				}
			}
		},
		debug: (world) => ({ critters: states(world).map(({ def, mode }) => `${def.sprite}@${def.x},${def.y}:${mode}`) }),
	};
}
