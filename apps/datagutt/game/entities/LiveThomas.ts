// The live datagutt NPC on the current map (docs/game/PLAN.md M4.2). His presence picks a
// place (game/live/datagutt.ts); when it changes while the player is watching, he walks:
// to the new spot on this map, out through the door toward another map, or in through
// the door he would come from. Off this map he simply is wherever his presence says.
import type Phaser from "phaser";
import { NPC_MOVEMENT, type MoverEvent } from "../world/movement";
import { directionBetween, type CollisionGrid, type Point } from "../world/grid";
import { findPath, findPathAdjacent } from "../world/pathfind";
import type { MapObject } from "../world/objects";
import { doingFor, nextMap, PLACE_MAPS, spotId, type Doing } from "../live/datagutt";
import type { Presence, PresenceFeed } from "@datagutt/kai-live";
import { EmoteBubble, SpeechBubble } from "../ui/Bubbles";
import { Actor } from "./Actor";

export const THOMAS_ID = "datagutt";

type NpcDef = Extract<MapObject, { type: "npc" }>;
type Spot = Extract<MapObject, { type: "spot" }>;
type Door = Extract<MapObject, { type: "door" }>;

export type LiveHost = {
	scene: Phaser.Scene;
	map: string;
	grid: CollisionGrid;
	spots: ReadonlyMap<string, Spot>;
	doors: ReadonlyMap<string, Door>;
	/** Make him talkable (or not) like any other NPC. */
	addNpc(def: NpcDef, actor: Actor): void;
	removeNpc(id: string): void;
	playerTile(): Point;
};

/** He shows his custom status in words only when the player is this close, in tiles. */
const SPEECH_RANGE = 7;
/** How far from the square's spot he strolls, in tiles, and how long he stands between strolls. */
const WANDER = { radius: 3, restMs: [2500, 6000] as const };
/** Standing in someone's way: give up on the path and look for another after this long. */
const BLOCKED_MS = 1500;
/** The head on the pillow: pixels from the bed spot's tile to where the sprite goes. */
const PILLOW = { x: -8, y: 4 };

export class LiveThomas {
	private doing: Doing;
	/** The player woke him (his asleep dialogue): up and about while his presence stays the same. */
	private woken = false;
	private actor: Actor | null = null;
	private def: NpcDef | null = null;
	private path: Point[] = [];
	private onArrive: (() => void) | null = null;
	private blockedMs = 0;
	private restMs = 0;
	/** Something else is shown over him (the interaction prompt): his bubbles step aside. */
	quiet = false;
	private readonly emote: EmoteBubble;
	private readonly speech: SpeechBubble;
	private readonly unsubscribe: () => void;

	constructor(
		private readonly host: LiveHost,
		feed: PresenceFeed,
		private readonly name: string,
		/** Where he is regardless of his presence (the finale's pier). */
		private readonly fixed: Doing | null = null,
	) {
		this.doing = fixed ?? doingFor(feed.current);
		this.emote = new EmoteBubble(host.scene);
		this.speech = new SpeechBubble(host.scene);
		if (PLACE_MAPS[this.doing.place] === host.map) this.appear(this.spot(this.doing)!, this.doing);
		this.unsubscribe = feed.subscribe((p) => this.onPresence(p));
	}

	/** For the ?debug readout: where he should be, and where he is on this map. */
	get state() {
		return { place: this.doing.place, tile: this.actor ? { ...this.actor.mover.tile } : null, asleep: this.actor?.asleep ?? false };
	}

	destroy(): void {
		this.unsubscribe();
		this.emote.destroy();
		this.speech.destroy();
	}

	private spot(doing: Doing): Spot | undefined {
		return this.host.spots.get(spotId(doing.place));
	}

	private onPresence(presence: Presence): void {
		if (this.fixed) return;
		const next = doingFor(presence);
		const before = this.doing;
		this.doing = next;
		if (next.place === before.place) {
			// Same place, maybe a new bubble or custom status. Woken by the player, he stays
			// up until his presence sends him somewhere else.
			if (this.actor && this.def) this.def.dialogue = next.asleep && !this.woken ? "datagutt_asleep" : "datagutt";
			return;
		}
		this.woken = false;
		const here = this.host.map;
		const target = PLACE_MAPS[next.place] === here ? this.spot(next) : undefined;
		if (this.actor) {
			this.wake();
			if (target) this.walkTo(target, next);
			else this.leaveToward(PLACE_MAPS[next.place]);
		} else if (target) {
			// Coming in: through the door on the way from where he was.
			const from = nextMap(here, PLACE_MAPS[before.place]);
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
		// Someone standing on his spot: he takes the free tile next to it.
		const free = (p: Point) => this.host.grid.occupantAt(p.x, p.y) === undefined;
		const around = [spot, { x: spot.x, y: spot.y + 1 }, { x: spot.x + 1, y: spot.y }, { x: spot.x - 1, y: spot.y }, { x: spot.x, y: spot.y - 1 }];
		const found = around.find((p, i) => free(p) && (i === 0 || this.host.grid.isWalkable(p.x, p.y)));
		if (!found) return;
		const tile = { x: found.x, y: found.y };
		const at = { ...spot, x: tile.x, y: tile.y };
		const actor = new Actor(this.host.scene, THOMAS_ID, "datagutt", tile, at.facing, NPC_MOVEMENT);
		this.def = { type: "npc", id: THOMAS_ID, character: "datagutt", x: at.x, y: at.y, facing: at.facing, name: this.name, dialogue: doing.dialogue ?? "datagutt" };
		this.actor = actor;
		this.host.grid.occupy(at.x, at.y, THOMAS_ID);
		this.host.addNpc(this.def, actor);
		if (doing.asleep) this.lieDown();
	}

	private vanish(): void {
		if (!this.actor) return;
		const t = this.actor.mover.tile;
		this.host.grid.vacate(t.x, t.y, THOMAS_ID);
		this.host.removeNpc(THOMAS_ID);
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
		this.def.dialogue = "datagutt_asleep";
	}

	/** The player woke him in conversation: out of bed, and awake while he stays put. */
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
		if (this.def) this.def.dialogue = "datagutt";
		const bed = actor.mover.tile;
		const floor = [
			{ x: bed.x + 1, y: bed.y },
			{ x: bed.x, y: bed.y + 2 },
			{ x: bed.x - 1, y: bed.y },
			{ x: bed.x + 1, y: bed.y + 1 },
		].find((p) => this.host.grid.isWalkable(p.x, p.y, THOMAS_ID));
		if (!floor) return;
		this.host.grid.vacate(bed.x, bed.y, THOMAS_ID);
		this.host.grid.occupy(floor.x, floor.y, THOMAS_ID);
		actor.mover.place(floor, "down");
	}

	private walkTo(target: Spot, doing: Doing): void {
		// A spot on furniture (the bed) is reached from beside it, then he lies down on it.
		const onFurniture = !this.host.grid.isWalkable(target.x, target.y, THOMAS_ID);
		this.setPath(target, onFurniture, () => {
			if (!this.actor) return;
			if (onFurniture) {
				const t = this.actor.mover.tile;
				this.host.grid.vacate(t.x, t.y, THOMAS_ID);
				this.host.grid.occupy(target.x, target.y, THOMAS_ID);
				this.actor.mover.place(target, target.facing);
			} else {
				this.actor.mover.face(target.facing);
			}
			if (doing.asleep) this.lieDown();
		});
	}

	private leaveToward(map: string): void {
		const next = nextMap(this.host.map, map);
		const door = [...this.host.doors.values()].find((d) => d.toMap === next);
		if (!door) {
			this.vanish();
			return;
		}
		this.setPath(door, false, () => this.vanish(), true);
	}

	/** `ontoDoor`: the last step is onto a door tile, which he may enter though the player can't stop on it. */
	private setPath(to: Point, adjacent: boolean, onArrive: () => void, ontoDoor = false): void {
		if (!this.actor) return;
		const from = this.actor.mover.destination;
		const walkable = {
			width: this.host.grid.width,
			height: this.host.grid.height,
			isWalkable: (x: number, y: number) => this.host.grid.isWalkable(x, y, THOMAS_ID) || (ontoDoor && x === to.x && y === to.y),
		};
		const path = adjacent ? findPathAdjacent(walkable, from, to) : findPath(walkable, from, to);
		this.path = path ?? [];
		this.onArrive = onArrive;
		this.blockedMs = 0;
		if (!path && this.host.grid.occupantAt(to.x, to.y) === undefined) {
			// No way through (someone in a doorway): get there anyway rather than stand stuck.
			// With the end itself taken, onArrive runs where he stands on the next update.
			this.host.grid.vacate(from.x, from.y, THOMAS_ID);
			this.host.grid.occupy(to.x, to.y, THOMAS_ID);
			this.actor.mover.place(to, "down");
		}
	}

	update(dtMs: number, timeMs: number): void {
		const actor = this.actor;
		if (!actor) return;
		const canEnter = (p: Point) => this.host.grid.isWalkable(p.x, p.y, THOMAS_ID) || this.isDoor(p);
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
			this.host.grid.vacate(e.from.x, e.from.y, THOMAS_ID);
			this.host.grid.occupy(e.to.x, e.to.y, THOMAS_ID);
			if (this.def) Object.assign(this.def, { x: e.to.x, y: e.to.y });
		}
	}

	/** A short stroll near the square's spot, then a rest. */
	private wander(dtMs: number): void {
		if ((this.restMs -= dtMs) > 0) return;
		const [min, max] = WANDER.restMs;
		this.restMs = min + Math.random() * (max - min);
		const home = this.spot(this.doing);
		if (!home) return;
		for (let tries = 0; tries < 8; tries++) {
			const x = home.x + Math.round((Math.random() * 2 - 1) * WANDER.radius);
			const y = home.y + Math.round((Math.random() * 2 - 1) * WANDER.radius);
			if (!this.host.grid.isWalkable(x, y, THOMAS_ID)) continue;
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
