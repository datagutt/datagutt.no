import Phaser from "phaser";
import { SERVICES_KEY, type GameServices, type WorldTarget } from "../boot";
import { TILE } from "../constants";
import { Actor } from "../entities/Actor";
import { InputController, type FrameInput } from "../input/InputController";
import { browserStorage, loadSave, writeSave } from "../save/save";
import { BlipPlayer, shouldBlip, voiceFor } from "../audio/blips";
import { DialogueBox } from "../ui/DialogueBox";
import { LinkOpener } from "../ui/LinkOpener";
import { resolveLink } from "../dialogue/links";
import type { DialogueRunner } from "../dialogue/DialogueRunner";
import { DIALOGUE_KEY } from "./PreloadScene";
import { CollisionGrid, directionBetween, neighbour, type Point } from "../world/grid";
import { NPC_MOVEMENT, PLAYER_MOVEMENT, type MoverEvent } from "../world/movement";
import { parseMapObject, type Facing, type MapObject, type TiledObject } from "../world/objects";
import { findPath, findPathAdjacent } from "../world/pathfind";

type Door = Extract<MapObject, { type: "door" }>;
type Sign = Extract<MapObject, { type: "sign" }>;
type NpcDef = Extract<MapObject, { type: "npc" }>;

const PLAYER_ID = "player";
const tileKey = (p: Point) => `${p.x},${p.y}`;
/** Tap-to-move runs when the path is at least this long. */
const RUN_PATH_LENGTH = 7;

export class WorldScene extends Phaser.Scene {
	private target!: WorldTarget;
	private services!: GameServices;
	private grid!: CollisionGrid;
	private player!: Actor;
	private npcs = new Map<string, { actor: Actor; def: NpcDef }>();
	private doors = new Map<string, Door>();
	private signs = new Map<string, Sign>();
	private input2!: InputController;
	private dialogue!: DialogueBox;
	private blips!: BlipPlayer;
	private links!: LinkOpener;
	private path: Point[] = [];
	private pathMarkers: Phaser.GameObjects.Rectangle[] = [];
	/** What to do when the current path ends (talk to the NPC that was tapped). */
	private onArrive: (() => void) | null = null;
	private transitioning = false;
	private mapWidth = 0;
	private mapHeight = 0;
	private debugText?: Phaser.GameObjects.BitmapText;

	constructor() {
		super("World");
	}

	init(target: WorldTarget) {
		this.target = target;
		this.services = this.registry.get(SERVICES_KEY) as GameServices;
		this.npcs = new Map();
		this.doors = new Map();
		this.signs = new Map();
		this.path = [];
		this.pathMarkers = [];
		this.onArrive = null;
		this.transitioning = false;
	}

	preload() {
		const key = `map:${this.target.map}`;
		if (!this.cache.tilemap.exists(key)) {
			this.load.setBaseURL(this.services.assetBase);
			this.load.tilemapTiledJSON(key, `maps/${this.target.map}.tmj`);
		}
	}

	create() {
		const map = this.make.tilemap({ key: `map:${this.target.map}` });
		const tileset = map.addTilesetImage("greybox", "tiles:greybox");
		if (!tileset) throw new Error(`Map ${this.target.map} does not use the greybox tileset`);
		this.mapWidth = map.width;
		this.mapHeight = map.height;
		this.grid = new CollisionGrid(map.width, map.height);

		for (const layerData of map.layers) {
			const layer = map.createLayer(layerData.name, tileset);
			if (!layer) continue;
			layer.setDepth(layerData.name.startsWith("above") ? 50_000 : -1);
			layer.forEachTile((tile) => {
				if (tile.index >= 0 && tile.properties?.collides) this.grid.setBlocked(tile.x, tile.y);
			});
		}

		const spawns = new Map<string, Extract<MapObject, { type: "spawn" }>>();
		const rawObjects = (map.getObjectLayer("objects")?.objects ?? []) as unknown as TiledObject[];
		for (const raw of rawObjects) {
			const obj = parseMapObject(raw, TILE);
			if (obj.type === "spawn") spawns.set(obj.id, obj);
			if (obj.type === "door") this.doors.set(tileKey(obj), obj);
			if (obj.type === "sign") this.signs.set(tileKey(obj), obj);
			if (obj.type === "npc") {
				const actor = new Actor(this, obj.id, obj.character, obj, obj.facing, NPC_MOVEMENT);
				this.npcs.set(obj.id, { actor, def: obj });
				this.grid.occupy(obj.x, obj.y, obj.id);
			}
		}

		const spawn = this.target.spawn ? spawns.get(this.target.spawn) : undefined;
		const startAt = this.target.tile ?? spawn ?? [...spawns.values()][0];
		if (!startAt) throw new Error(`Map ${this.target.map} has no spawn point`);
		const start = { x: startAt.x, y: startAt.y };
		const facing = this.target.facing ?? spawn?.facing ?? "down";
		this.player = new Actor(this, PLAYER_ID, "player", start, facing, PLAYER_MOVEMENT);
		this.grid.occupy(start.x, start.y, PLAYER_ID);

		this.input2 = new InputController(this);
		this.dialogue = new DialogueBox(this);
		this.links = new LinkOpener((clientX, clientY) => {
			if (clientX === undefined || clientY === undefined) return this.dialogue.selectedChoice === 0;
			const x = this.scale.transformX(clientX + window.scrollX);
			const y = this.scale.transformY(clientY + window.scrollY);
			return this.dialogue.choiceAt(x, y) === 0;
		});
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.links.destroy());
		this.blips = new BlipPlayer(() =>
			this.sound instanceof Phaser.Sound.WebAudioSoundManager
				? { context: this.sound.context, destination: this.sound.destination }
				: null,
		);
		this.fitCamera();
		this.cameras.main.startFollow(this.player.sprite, true);
		this.cameras.main.fadeIn(180, 11, 19, 32);
		this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));

		if (new URLSearchParams(window.location.search).has("debug")) {
			this.debugText = this.add.bitmapText(2, 2, "pixel", "").setScrollFactor(0).setDepth(200_000).setTint(0xffd27a);
		}
		this.save();
	}

	private onResize(size: Phaser.Structs.Size) {
		this.cameras.resize(size.width, size.height);
		this.fitCamera();
		this.dialogue.relayout();
	}

	/** Clamp the camera to the map, centring maps smaller than the screen. */
	private fitCamera() {
		const cam = this.cameras.main;
		const w = this.mapWidth * TILE;
		const h = this.mapHeight * TILE;
		const x = w < cam.width ? -Math.floor((cam.width - w) / 2) : 0;
		const y = h < cam.height ? -Math.floor((cam.height - h) / 2) : 0;
		cam.setBounds(x, y, Math.max(w, cam.width), Math.max(h, cam.height));
	}

	update(time: number, delta: number) {
		const dt = Math.min(delta, 50); // no huge jumps after a stalled tab
		const input = this.input2.poll();
		this.dialogue.update(dt, time);
		this.updateDebug();

		if (this.transitioning) return;
		if (this.dialogue.open) {
			for (const dir of input.dirPresses) this.dialogue.move(dir);
			if (input.interact || input.back) this.dialogue.advance();
			for (const tap of input.taps) this.dialogue.tap(tap.screenX, tap.screenY);
			this.player.sync();
			return;
		}

		this.handleTaps(input);
		if (input.interact && !this.player.mover.moving) this.interactAhead();

		if (input.dir) this.clearPath(); // keys and pads always override a tap path

		const events = this.player.mover.update(dt, { dir: input.dir, run: input.run }, (p) =>
			this.grid.isWalkable(p.x, p.y, PLAYER_ID),
		);
		this.handleEvents(events);
		if (this.path.length && !this.player.mover.moving && !this.transitioning) {
			this.followPath(input.run || this.path.length >= RUN_PATH_LENGTH);
		}

		this.player.sync();
		for (const { actor } of this.npcs.values()) actor.sync();

	}

	/** FPS overlay and window.__fjord state, only with ?debug. Runs every frame. */
	private updateDebug() {
		if (!this.debugText) return;
		const p = this.player.mover.tile;
		this.debugText.setText(`${Math.round(this.game.loop.actualFps)} fps  ${this.target.map} ${p.x},${p.y}`);
		// Read by e2e tests and dev tooling.
		(window as unknown as { __fjord?: object }).__fjord = {
			map: this.target.map,
			tile: { ...p },
			facing: this.player.mover.facing,
			moving: this.player.mover.moving,
			dialogueOpen: this.dialogue.open,
			choices: this.dialogue.currentChoices,
			selected: this.dialogue.selectedChoice,
			blips: this.blips.played,
			audio: this.sound instanceof Phaser.Sound.WebAudioSoundManager ? this.sound.context.state : "none",
			camera: { x: this.cameras.main.worldView.x, y: this.cameras.main.worldView.y, zoom: this.scale.zoom },
		};
	}

	private handleEvents(events: MoverEvent[]) {
		for (const e of events) {
			if (e.type === "stepStarted") {
				// The player holds only the tile they are heading into.
				this.grid.vacate(e.from.x, e.from.y, PLAYER_ID);
				this.grid.occupy(e.to.x, e.to.y, PLAYER_ID);
			} else if (e.type === "stepEnded") {
				this.pathMarkers.shift()?.destroy();
				const door = this.doors.get(tileKey(e.at));
				if (door) {
					this.enterDoor(door);
					return;
				}
				this.save();
				if (!this.path.length && this.onArrive) {
					const arrive = this.onArrive;
					this.onArrive = null;
					arrive();
				}
			} else if (e.type === "bumped") {
				this.clearPath();
			}
		}
	}

	private followPath(run: boolean) {
		const next = this.path[0];
		const dir = directionBetween(this.player.mover.tile, next);
		if (!dir || !this.grid.isWalkable(next.x, next.y, PLAYER_ID)) {
			this.clearPath();
			return;
		}
		this.path.shift();
		this.handleEvents(this.player.mover.walk(dir, run, (p) => this.grid.isWalkable(p.x, p.y, PLAYER_ID)));
	}

	private handleTaps(input: FrameInput) {
		const tap = input.taps.at(-1);
		if (!tap) return;
		const target = { x: Math.floor(tap.x / TILE), y: Math.floor(tap.y / TILE) };
		if (!this.grid.inBounds(target.x, target.y)) return;
		const from = this.player.mover.destination;
		const walkable = { width: this.grid.width, height: this.grid.height, isWalkable: (x: number, y: number) => this.grid.isWalkable(x, y, PLAYER_ID) };

		const npc = this.npcAt(target);
		const sign = this.signs.get(tileKey(target));
		if (npc || sign) {
			const path = findPathAdjacent(walkable, from, target);
			if (!path) return;
			this.setPath(path, () => {
				const dir = directionBetween(this.player.mover.tile, target);
				if (dir) this.player.mover.face(dir);
				this.interactWith(target);
			});
			return;
		}
		const path = findPath(walkable, from, target);
		if (path) this.setPath(path, null);
	}

	private setPath(path: Point[], onArrive: (() => void) | null) {
		this.clearPath();
		this.path = path;
		this.onArrive = onArrive;
		this.pathMarkers = path.map((p) =>
			this.add.rectangle(p.x * TILE + 7, p.y * TILE + 7, 2, 2, 0xe8f5e9, 0.8).setOrigin(0).setDepth(-0.5),
		);
		if (!path.length && onArrive) {
			this.onArrive = null;
			onArrive();
		}
	}

	private clearPath() {
		this.path = [];
		this.onArrive = null;
		for (const m of this.pathMarkers) m.destroy();
		this.pathMarkers = [];
	}

	private npcAt(p: Point) {
		const id = this.grid.occupantAt(p.x, p.y);
		return id && id !== PLAYER_ID ? this.npcs.get(id) : undefined;
	}

	private interactAhead() {
		this.interactWith(neighbour(this.player.mover.tile, this.player.mover.facing));
	}

	private interactWith(p: Point) {
		const npc = this.npcAt(p);
		if (npc) {
			const toward = directionBetween(p, this.player.mover.tile);
			if (toward) npc.actor.mover.face(toward);
			this.talk(npc.def);
			return;
		}
		const sign = this.signs.get(tileKey(p));
		if (sign) this.dialogue.say(sign.text, null, () => this.dialogue.close());
	}

	/** Play an NPC's Ink knot beat by beat until it ends. */
	private talk(npc: NpcDef) {
		const runner = this.registry.get(DIALOGUE_KEY) as DialogueRunner;
		runner.start(npc.dialogue);
		const step = () => {
			const beat = runner.next();
			if (beat.type === "line") {
				const gesture = beat.tags.includes("nod") ? "nod" : beat.tags.includes("shake") ? "shake" : null;
				// A `# speaker:` tag means someone else is talking: no portrait for them yet.
				const portrait = beat.speaker ? null : npc.character;
				const voice = voiceFor(beat.speaker ? null : npc.character);
				const onChar = (text: string, i: number) => shouldBlip(text, i, voice.every) && this.blips.play(voice);
				const link = beat.tags.map(resolveLink).find((l) => l && !("error" in l));
				const next = link && !("error" in link) ? () => this.offerLink(link.url, link.label, step) : step;
				this.dialogue.say(beat.text, beat.speaker ?? npc.name, next, { portrait, gesture, onChar });
			} else if (beat.type === "choices") {
				this.dialogue.choose(beat.choices, (i) => {
					runner.choose(i);
					step();
				});
			} else {
				this.dialogue.close();
				this.save();
			}
		};
		step();
	}

	/** "Open github.com?" after a line with a `# link:` tag. */
	private offerLink(url: string, label: string, then: () => void) {
		this.links.arm(url);
		this.dialogue.choose([`Open ${label}`, "Not now"], (i) => {
			if (i === 0) this.links.confirm();
			else this.links.disarm();
			then();
		});
	}

	private enterDoor(door: Door) {
		this.transitioning = true;
		this.clearPath();
		const cam = this.cameras.main;
		cam.fadeOut(160, 11, 19, 32);
		cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
			this.scene.restart({ map: door.toMap, spawn: door.toSpawn } satisfies WorldTarget);
		});
	}

	private save() {
		const storage = browserStorage();
		const previous = loadSave(storage);
		const { tile, facing } = this.player.mover;
		writeSave(storage, {
			map: this.target.map,
			x: tile.x,
			y: tile.y,
			facing: facing as Facing,
			stamps: previous?.stamps ?? [],
			flags: previous?.flags ?? {},
			dialogue: { ...(previous?.dialogue ?? {}), main: (this.registry.get(DIALOGUE_KEY) as DialogueRunner).saveState() },
			settings: previous?.settings ?? { muted: false, showVisitors: true, reducedMotion: null },
		});
	}
}
