// A live NPC on the current map. Their presence picks a place (rules.ts); when it changes
// while the player is watching, they walk: to the new spot on this map, out through the
// door toward another map, or in through the door they would come from. Off this map they
// simply are wherever their presence says.
import type Phaser from "phaser";
import { NPC_MOVEMENT, type MoverEvent } from "@datagutt/kai/world/movement";
import { directionBetween, type CollisionGrid, type Point } from "@datagutt/kai/world/grid";
import { findPath, findPathAdjacent } from "@datagutt/kai/world/pathfind";
import type { DoorObject as Door, NpcObject as NpcDef, SpotObject as Spot } from "@datagutt/kai/world/objects";
import type { Presence, PresenceFeed } from "../lanyard.ts";
import type { PresenceConfig } from "./config.ts";
import { doingFor, nextMap, spotId, type Doing } from "./rules.ts";
import { EmoteBubble, SpeechBubble } from "@datagutt/kai/ui/Bubbles";
import { Actor } from "@datagutt/kai/entities/Actor";

export type LiveHost = {
	scene: Phaser.Scene;
	map: string;
	grid: CollisionGrid;
	spots: ReadonlyMap<string, Spot>;
	doors: ReadonlyMap<string, Door>;
	/** Make them talkable (or not) like any other NPC. */
	addNpc(def: NpcDef, actor: Actor): void;
	removeNpc(id: string): void;
	playerTile(): Point;
};

/** Their custom status shows in words only when the player is this close, in tiles. */
const SPEECH_RANGE = 7;
/** How far from their spot they stroll, in tiles, and how long they stand between strolls. */
const WANDER = { radius: 3, restMs: [2500, 6000] as const };
/** Standing in someone's way: give up on the path and look for another after this long. */
const BLOCKED_MS = 1500;
/** The head on the pillow: pixels from a bed spot's tile to where the sprite goes. */
const PILLOW = { x: -8, y: 4 };

export class LiveNpc {
	private doing: Doing;
	/** The player woke them (their asleep dialogue): up and about while their presence stays the same. */
	private woken = false;
	private actor: Actor | null = null;
	private def: NpcDef | null = null;
	private path: Point[] = [];
	private onArrive: (() => void) | null = null;
	private blockedMs = 0;
	private restMs = 0;
	/** Something else is shown over them (the interaction prompt): their bubbles step aside. */
	quiet = false;
	private readonly emote: EmoteBubble;
	private readonly speech: SpeechBubble;
	private readonly unsubscribe: () => void;

	constructor(
		private readonly host: LiveHost,
		private readonly config: PresenceConfig,
		feed: PresenceFeed,
		private readonly name: string,
		/** Where they are regardless of their presence (a story night). */
		private readonly fixed: Doing | null = null,
	) {
		this.doing = fixed ?? doingFor(config, feed.current);
		this.emote = new EmoteBubble(host.scene);
		this.speech = new SpeechBubble(host.scene);
		const spot = this.mapOf(this.doing.place) === host.map ? this.spot(this.doing) : undefined;
		if (spot) this.appear(spot, this.doing);
		this.unsubscribe = feed.subscribe((p) => this.onPresence(p));
	}

	/** For the ?debug readout: where they should be, and where they are on this map. */
	get state() {
		return { place: this.doing.place, tile: this.actor ? { ...this.actor.mover.tile } : null, asleep: this.actor?.asleep ?? false };
	}

	destroy(): void {
		this.unsubscribe();
		this.emote.destroy();
		this.speech.destroy();
	}

	private get id(): string {
		return this.config.npc;
	}

	private mapOf(place: string): string | undefined {
		return this.config.places[place]?.map;
	}

	private spot(doing: Doing): Spot | undefined {
		return this.host.spots.get(spotId(this.config, doing.place));
	}

	/** Their own knot, or the asleep one. */
	private knot(asleep: boolean): string {
		return asleep ? this.config.asleepKnot : this.id;
	}

	private onPresence(presence: Presence): void {
		if (this.fixed) return;
		const next = doingFor(this.config, presence);
		const before = this.doing;
		this.doing = next;
		if (next.place === before.place) {
			// Same place, maybe a new bubble or custom status. Woken by the player, they stay
			// up until their presence sends them somewhere else.
			if (this.actor && this.def) this.def.dialogue = this.knot(next.asleep && !this.woken);
			return;
		}
		this.woken = false;
		const here = this.host.map;
		const target = this.mapOf(next.place) === here ? this.spot(next) : undefined;
		if (this.actor) {
			this.wake();
			if (target) this.walkTo(target, next);
			else this.leaveToward(this.mapOf(next.place));
		} else if (target) {
			// Coming in: through the door on the way from where they were.
			const from = nextMap(this.config.routes, here, this.mapOf(before.place) ?? here);
			const door = [...this.host.doors.values()].find((d) => d.toMap === from);
			const entry = door ? { x: door.x, y: door.y + 1 } : null;
			if (entry && this.host.grid.isWalkable(entry.x, entry.y)) {
				this.appear({ type: "spot", id: "door", x: entry.x, y: entry.y, facing: "down" }, { ...next, asleep: false });
				this.walkTo(target, next);
			} else {
				this.appear(target, next);
			}
		}
	}

	private appear(spot: Spot, doing: Doing): void {
		// Someone standing on their spot: they take the free tile next to it.
		const free = (p: Point) => this.host.grid.occupantAt(p.x, p.y) === undefined;
		const around = [spot, { x: spot.x, y: spot.y + 1 }, { x: spot.x + 1, y: spot.y }, { x: spot.x - 1, y: spot.y }, { x: spot.x, y: spot.y - 1 }];
		const found = around.find((p, i) => free(p) && (i === 0 || this.host.grid.isWalkable(p.x, p.y)));
		if (!found) return;
		const tile = { x: found.x, y: found.y };
		const at = { ...spot, x: tile.x, y: tile.y };
		const actor = new Actor(this.host.scene, this.id, this.id, tile, at.facing, NPC_MOVEMENT);
		this.def = { type: "npc", id: this.id, character: this.id, x: at.x, y: at.y, facing: at.facing, name: this.name, dialogue: doing.dialogue ?? this.id };
		this.actor = actor;
		this.host.grid.occupy(at.x, at.y, this.id);
		this.host.addNpc(this.def, actor);
		if (doing.asleep) this.lieDown();
	}

	private vanish(): void {
		if (!this.actor) return;
		const t = this.actor.mover.tile;
		this.host.grid.vacate(t.x, t.y, this.id);
		this.host.removeNpc(this.id);
		this.actor.destroy();
		this.actor = this.def = null;
		this.path = [];
		this.onArrive = null;
		this.emote.show(null);
		this.speech.show(null);
	}

	private lieDown(): void {
		if (!this.actor || !this.def) return;
		this.actor.asleep = true;
		this.actor.offset = { ...PILLOW };
		this.def.dialogue = this.config.asleepKnot;
	}

	/** The player woke them in conversation: out of bed, and awake while they stay put. */
	wokenByPlayer(): void {
		this.woken = true;
		this.wake();
	}

	/** Out of bed and onto the nearest free floor, ready to walk. */
	private wake(): void {
		const actor = this.actor;
		if (!actor?.asleep) return;
		actor.asleep = false;
		actor.offset = { x: 0, y: 0 };
		if (this.def) this.def.dialogue = this.id;
		const bed = actor.mover.tile;
		const floor = [
			{ x: bed.x + 1, y: bed.y },
			{ x: bed.x, y: bed.y + 2 },
			{ x: bed.x - 1, y: bed.y },
			{ x: bed.x + 1, y: bed.y + 1 },
		].find((p) => this.host.grid.isWalkable(p.x, p.y, this.id));
		if (!floor) return;
		this.host.grid.vacate(bed.x, bed.y, this.id);
		this.host.grid.occupy(floor.x, floor.y, this.id);
		actor.mover.place(floor, "down");
	}

	private walkTo(target: Spot, doing: Doing): void {
		// A spot on furniture (a bed) is reached from beside it, then they lie down on it.
		const onFurniture = !this.host.grid.isWalkable(target.x, target.y, this.id);
		this.setPath(target, onFurniture, () => {
			if (!this.actor) return;
			if (onFurniture) {
				const t = this.actor.mover.tile;
				this.host.grid.vacate(t.x, t.y, this.id);
				this.host.grid.occupy(target.x, target.y, this.id);
				this.actor.mover.place(target, target.facing);
			} else {
				this.actor.mover.face(target.facing);
			}
			if (doing.asleep) this.lieDown();
		});
	}

	private leaveToward(map: string | undefined): void {
		const next = map ? nextMap(this.config.routes, this.host.map, map) : null;
		const door = [...this.host.doors.values()].find((d) => d.toMap === next);
		if (!door) {
			this.vanish();
			return;
		}
		this.setPath(door, false, () => this.vanish(), true);
	}

	/** `ontoDoor`: the last step is onto a door tile, which they may enter though the player can't stop on it. */
	private setPath(to: Point, adjacent: boolean, onArrive: () => void, ontoDoor = false): void {
		if (!this.actor) return;
		const from = this.actor.mover.destination;
		const walkable = {
			width: this.host.grid.width,
			height: this.host.grid.height,
			isWalkable: (x: number, y: number) => this.host.grid.isWalkable(x, y, this.id) || (ontoDoor && x === to.x && y === to.y),
		};
		const path = adjacent ? findPathAdjacent(walkable, from, to) : findPath(walkable, from, to);
		this.path = path ?? [];
		this.onArrive = onArrive;
		this.blockedMs = 0;
		if (!path && this.host.grid.occupantAt(to.x, to.y) === undefined) {
			// No way through (someone in a doorway): get there anyway rather than stand stuck.
			// With the end itself taken, onArrive runs where they stand on the next update.
			this.host.grid.vacate(from.x, from.y, this.id);
			this.host.grid.occupy(to.x, to.y, this.id);
			this.actor.mover.place(to, "down");
		}
	}

	update(dtMs: number, timeMs: number): void {
		const actor = this.actor;
		if (!actor) return;
		const canEnter = (p: Point) => this.host.grid.isWalkable(p.x, p.y, this.id) || this.isDoor(p);
		this.handle(actor.mover.update(dtMs, { dir: null, run: false }, canEnter));
		if (!this.actor) return;
		if (!actor.mover.moving && this.path.length) {
			const next = this.path[0];
			const dir = directionBetween(actor.mover.tile, next);
			if (dir && canEnter(next)) {
				this.path.shift();
				this.blockedMs = 0;
				this.handle(actor.mover.walk(dir, false, canEnter));
			} else if ((this.blockedMs += dtMs) > BLOCKED_MS && this.onArrive) {
				// Someone is in the way: find another way to the same end.
				const end = this.path.at(-1)!;
				const arrive = this.onArrive;
				this.setPath(end, false, arrive, this.isDoor(end));
			}
		} else if (!actor.mover.moving && !this.path.length && this.onArrive) {
			const arrive = this.onArrive;
			this.onArrive = null;
			arrive();
		} else if (!actor.mover.moving && this.doing.wanders && !this.onArrive) {
			this.wander(dtMs);
		}
		if (!this.actor) return;
		actor.sync();
		this.updateBubbles(actor, timeMs);
	}

	private isDoor(p: Point): boolean {
		return this.host.doors.has(`${p.x},${p.y}`);
	}

	private handle(events: MoverEvent[]): void {
		for (const e of events) {
			if (e.type !== "stepStarted") continue;
			this.host.grid.vacate(e.from.x, e.from.y, this.id);
			this.host.grid.occupy(e.to.x, e.to.y, this.id);
			if (this.def) Object.assign(this.def, { x: e.to.x, y: e.to.y });
		}
	}

	/** A short stroll near their spot, then a rest. */
	private wander(dtMs: number): void {
		if ((this.restMs -= dtMs) > 0) return;
		const [min, max] = WANDER.restMs;
		this.restMs = min + Math.random() * (max - min);
		const home = this.spot(this.doing);
		if (!home) return;
		for (let tries = 0; tries < 8; tries++) {
			const x = home.x + Math.round((Math.random() * 2 - 1) * WANDER.radius);
			const y = home.y + Math.round((Math.random() * 2 - 1) * WANDER.radius);
			if (!this.host.grid.isWalkable(x, y, this.id)) continue;
			this.setPath({ x, y }, false, () => this.actor?.mover.face("down"));
			return;
		}
	}

	private updateBubbles(actor: Actor, timeMs: number): void {
		const x = actor.centerX;
		const player = this.host.playerTile();
		const near = Math.abs(player.x - actor.mover.tile.x) + Math.abs(player.y - actor.mover.tile.y) <= SPEECH_RANGE;
		// Words when the player is close enough to read them, the emote otherwise.
		const says = near && !actor.mover.moving && !this.quiet ? this.doing.says : null;
		this.speech.show(says);
		this.emote.show(says || this.quiet ? null : this.doing.emote);
		this.speech.update(x, actor.headTop);
		this.emote.update(timeMs, x, actor.headTop);
	}
}
