import Phaser from "phaser";
import { SERVICES_KEY, type GameServices, type WorldTarget } from "../boot";
import { TILE } from "../constants";
import { Actor } from "../entities/Actor";
import { LiveThomas, THOMAS_ID } from "../entities/LiveThomas";
import { GhostLayer } from "../entities/Ghosts";
import { EmoteWheel } from "../ui/EmoteWheel";
import { Prompt } from "../ui/Prompt";
import { EmoteBubble } from "../ui/Bubbles";
import { SimulatedGhosts } from "../dev/simulatedGhosts";
import { InputController, type FrameInput, type InputDevice } from "../input/InputController";
import { browserStorage, writeSave } from "../save/save";
import { playPaper, playStamp, playTick, type AudioOutput } from "../audio/sfx";
import { stampForNpc } from "../progress/passport";
import { PROGRESS_KEY, type Progress } from "../progress/Progress";
import { StampToast } from "../ui/Passport";
import { MenuButton, StartMenu } from "../ui/StartMenu";
import { BlipPlayer, shouldBlip, voiceFor } from "../audio/blips";
import { DialogueBox } from "../ui/DialogueBox";
import { LinkOpener } from "../ui/LinkOpener";
import { resolveLink } from "../dialogue/links";
import { npc as rosterNpc } from "../npcs";
import type { DialogueRunner } from "../dialogue/DialogueRunner";
import { DIALOGUE_KEY } from "./PreloadScene";
import { CollisionGrid, directionBetween, neighbour, type Point } from "../world/grid";
import { NPC_MOVEMENT, PLAYER_MOVEMENT, type MoverEvent } from "../world/movement";
import { parseMapObject, type Facing, type LightObject, type MapObject, type TiledObject } from "../world/objects";
import { addLights } from "../fx/Lights";
import { DayNight } from "../fx/DayNight";
import { Weather } from "../fx/Weather";
import { fieldLevels } from "../live/field";
import { spines } from "../live/shelf";
import { findPath, findPathAdjacent } from "../world/pathfind";
import { applySeason } from "../world/season";
import { statusLines } from "../live/datagutt";

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
	private thomas!: LiveThomas;
	private dayNight!: DayNight;
	private weather: Weather | null = null;
	private prompt!: Prompt;
	private ghosts!: GhostLayer;
	private wheel!: EmoteWheel;
	/** The player's own emote, shown for a moment after picking it. */
	private selfEmote!: EmoteBubble;
	private selfEmoteUntil = 0;
	private simulated: SimulatedGhosts | null = null;
	private doors = new Map<string, Door>();
	private signs = new Map<string, Sign>();
	private input2!: InputController;
	private dialogue!: DialogueBox;
	private blips!: BlipPlayer;
	private links!: LinkOpener;
	private menu!: StartMenu;
	private menuButton!: MenuButton;
	private stampToast!: StampToast;
	private audioOut!: AudioOutput;
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
		const map = this.make.tilemap({ key: this.seasonalMapKey() });
		// Generated maps use the packed "world" tileset; the name comes from the map.
		const tilesetName = map.tilesets[0]?.name ?? "";
		const tileset = map.addTilesetImage(tilesetName, `tiles:${tilesetName}`);
		if (!tileset) throw new Error(`Map ${this.target.map} uses unknown tileset "${tilesetName}"`);
		this.mapWidth = map.width;
		this.mapHeight = map.height;
		this.grid = new CollisionGrid(map.width, map.height);

		// Layer order matters: `collision` then `manual_collision`, whose clear tiles unblock.
		const layers = new Map<string, Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer>();
		for (const layerData of map.layers) {
			const layer = map.createLayer(layerData.name, tileset);
			if (!layer) continue;
			layers.set(layerData.name, layer);
			const collisionOnly = layerData.name === "collision" || layerData.name === "manual_collision";
			layer.setVisible(!collisionOnly);
			layer.setDepth(layerData.name.includes("above") ? 50_000 : -1);
			// Blended layers (the `shade` layer multiplies) say so in a layer property.
			const blend = (layerData.properties as { name: string; value: unknown }[] | undefined)?.find((p) => p.name === "blend")?.value;
			if (blend === "multiply") layer.setBlendMode(Phaser.BlendModes.MULTIPLY);
			if (blend === "add") layer.setBlendMode(Phaser.BlendModes.ADD);
			layer.forEachTile((tile) => {
				if (tile.index < 0) return;
				if (tile.properties?.collides) this.grid.setBlocked(tile.x, tile.y);
				if (tile.properties?.clears) this.grid.setBlocked(tile.x, tile.y, false);
			});
		}

		const spawns = new Map<string, Extract<MapObject, { type: "spawn" }>>();
		const spots = new Map<string, Extract<MapObject, { type: "spot" }>>();
		// Generated `objects` plus any `manual_*` object layers added in Tiled.
		const rawObjects = map.objects.flatMap((layer) => layer.objects) as unknown as TiledObject[];
		const lights: LightObject[] = [];
		for (const raw of rawObjects) {
			const obj = parseMapObject(raw, TILE);
			if (obj.type === "spawn") spawns.set(obj.id, obj);
			if (obj.type === "spot") spots.set(obj.id, obj);
			if (obj.type === "door") this.doors.set(tileKey(obj), obj);
			if (obj.type === "sign") this.signs.set(tileKey(obj), obj);
			if (obj.type === "light") lights.push(obj);
			if (obj.type === "crops") this.plantField(obj, layers.get("decal"));
			if (obj.type === "books") this.stockShelf(obj);
			if (obj.type === "npc") {
				const actor = new Actor(this, obj.id, obj.character, obj, obj.facing, NPC_MOVEMENT);
				this.npcs.set(obj.id, { actor, def: obj });
				this.grid.occupy(obj.x, obj.y, obj.id);
			}
		}

		const images = addLights(this, lights, this.progress.reducedMotion);
		const outdoors = (map.properties as { name: string; value: unknown }[] | undefined)?.some((p) => p.name === "outdoor" && p.value === "true") ?? false;
		this.dayNight = new DayNight(this, lights.map((light, i) => ({ light, image: images[i] })), outdoors, this.services.hours, this.services.month);
		this.weather = outdoors ? new Weather(this, this.services.season, this.progress.reducedMotion) : null;
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.weather?.destroy());

		const spawn = this.target.spawn ? spawns.get(this.target.spawn) : undefined;
		const startAt = this.target.tile ?? spawn ?? [...spawns.values()][0];
		if (!startAt) throw new Error(`Map ${this.target.map} has no spawn point`);
		const start = { x: startAt.x, y: startAt.y };
		const facing = this.target.facing ?? spawn?.facing ?? "down";
		this.player = new Actor(this, PLAYER_ID, "player", start, facing, PLAYER_MOVEMENT);
		this.grid.occupy(start.x, start.y, PLAYER_ID);
		this.thomas = new LiveThomas(
			{
				scene: this,
				map: this.target.map,
				grid: this.grid,
				spots,
				doors: this.doors,
				addNpc: (def, actor) => this.npcs.set(def.id, { actor, def }),
				removeNpc: (id) => this.npcs.delete(id),
				playerTile: () => this.player.mover.tile,
			},
			this.services.presence,
			rosterNpc(THOMAS_ID)?.name ?? "Thomas",
		);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.thomas.destroy());

		// Other visitors: this map's room, joined at the player's tile.
		this.ghosts = new GhostLayer(this, this.target.map);
		const client = this.services.ghosts;
		const unsubscribe = client?.subscribe((m) => this.ghosts.handle(m));
		this.wheel = new EmoteWheel(this);
		this.prompt = new Prompt(this);
		this.selfEmote = new EmoteBubble(this);
		this.applyVisitors();
		const params = new URLSearchParams(window.location.search);
		const crowd = params.has("debug") ? Number(params.get("ghosts")) : 0;
		if (crowd > 0) this.simulated = new SimulatedGhosts(crowd, start, this.grid, (m) => this.ghosts.handle(m, true));
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			unsubscribe?.();
			this.ghosts.destroy();
			this.wheel.close();
			this.prompt.destroy();
			this.selfEmote.destroy();
			this.simulated = null;
		});

		this.input2 = new InputController(this);
		this.dialogue = new DialogueBox(this);
		this.links = new LinkOpener((clientX, clientY) => {
			if (clientX === undefined || clientY === undefined) return this.dialogue.selectedChoice === 0;
			const x = this.scale.transformX(clientX + window.scrollX);
			const y = this.scale.transformY(clientY + window.scrollY);
			return this.dialogue.choiceAt(x, y) === 0;
		});
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.links.destroy());
		this.audioOut = () =>
			this.sound instanceof Phaser.Sound.WebAudioSoundManager
				? { context: this.sound.context, destination: this.sound.destination }
				: null;
		this.blips = new BlipPlayer(this.audioOut);
		this.menuButton = new MenuButton(this);
		this.menu = new StartMenu(this, {
			stamps: () => this.progress.stamps,
			settings: () => {
				const { muted, reducedMotion, showVisitors } = this.progress.settings;
				return { muted, reducedMotion, showVisitors };
			},
			changeSettings: (next) => {
				this.progress.settings = { ...this.progress.settings, ...next };
				this.sound.mute = next.muted;
				this.applyVisitors();
				this.save();
			},
			status: () => statusLines(this.services.presence.current),
			openJournal: () => {
				this.save();
				window.location.href = "/journal";
			},
			sound: (kind) => (kind === "open" ? playPaper(this.audioOut) : playTick(this.audioOut, kind === "select" ? 660 : 880)),
		});
		this.stampToast = new StampToast(this);
		this.fitCamera();
		this.cameras.main.startFollow(this.player.sprite, true);
		this.cameras.main.fadeIn(180, 11, 19, 32);
		this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));

		if (new URLSearchParams(window.location.search).has("debug")) {
			this.debugText = this.add.bitmapText(2, 28, "pixel", "").setScrollFactor(0).setDepth(200_000).setTint(0xffd27a);
		}
		this.save();
	}

	private onResize(size: Phaser.Structs.Size) {
		this.cameras.resize(size.width, size.height);
		this.dayNight.resize(size.width, size.height);
		this.weather?.resize(size.width, size.height);
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
		this.dayNight.update(time);
		if (this.transitioning || this.menu.open || this.dialogue.open || this.wheel.open) this.prompt.hide();
		this.updateDebug();

		if (this.transitioning) return;
		if (this.menu.open) {
			this.menu.handle(input);
			this.menuButton.setVisible(!this.menu.open);
			this.player.sync();
			return;
		}
		const buttonTapped = !this.dialogue.open && input.taps.some((t) => this.menuButton.hit(t.screenX, t.screenY));
		if ((input.menu || buttonTapped) && !this.dialogue.open && !this.player.mover.moving) {
			this.clearPath();
			this.menu.show();
			this.menuButton.setVisible(false);
			this.player.sync();
			return;
		}
		if (this.wheel.open) {
			this.wheel.handle(input);
			this.player.sync();
			this.updateSelfEmote(time);
			return;
		}
		if (this.dialogue.open) {
			for (const dir of input.dirPresses) this.dialogue.move(dir);
			if (input.interact || input.back) this.dialogue.advance();
			for (const tap of input.taps) this.dialogue.tap(tap.screenX, tap.screenY);
			this.player.sync();
			return;
		}

		const onPlayer = (p: { x: number; y: number }) => this.player.sprite.getBounds().contains(p.x, p.y);
		if (!this.player.mover.moving && (input.interactHeld || input.longPresses.some(onPlayer))) {
			this.openEmoteWheel();
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
		for (const [id, { actor }] of this.npcs) if (id !== THOMAS_ID) actor.sync();
		this.thomas.update(dt, time);
		this.simulated?.update(dt);
		this.ghosts.update(dt, time, this.player.mover.tile);
		this.updateSelfEmote(time);
		this.updatePrompt(input.device);

	}

	/** Other visitors on or off, from the setting (the rx_off kill switch means no client at all). */
	private applyVisitors() {
		const client = this.services.ghosts;
		if (!client) return;
		if (this.progress.settings.showVisitors) {
			client.start();
			const t = this.player.mover.destination;
			client.join(this.target.map, t.x, t.y, this.player.mover.facing);
		} else {
			client.stop();
			this.ghosts.handle({ t: "room", map: this.target.map, ghosts: [] });
		}
	}

	private openEmoteWheel() {
		this.clearPath();
		const cam = this.cameras.main;
		const sprite = this.player.sprite;
		this.wheel.show(sprite.x + sprite.width / 2 - cam.worldView.x, this.player.headTop - 8 - cam.worldView.y, (emote) => {
			if (!emote) return;
			this.selfEmote.show(emote);
			this.selfEmoteUntil = this.time.now + 3_000;
			if (this.progress.settings.showVisitors) this.services.ghosts?.emote(emote);
		});
	}

	private updateSelfEmote(time: number) {
		if (this.selfEmoteUntil && time > this.selfEmoteUntil) {
			this.selfEmoteUntil = 0;
			this.selfEmote.show(null);
		}
		const sprite = this.player.sprite;
		this.selfEmote.update(time, sprite.x + sprite.width / 2, this.player.headTop);
	}

	/**
	 * The cache key of this map as it looks in the current season: outdoor maps carry a
	 * swap table per season (game/world/season.ts), applied once to a copy of the map.
	 */
	private seasonalMapKey(): string {
		const key = `map:${this.target.map}`;
		const season = this.services.season;
		if (season === "summer") return key;
		const seasonal = `${key}@${season}`;
		if (!this.cache.tilemap.exists(seasonal)) {
			const entry = this.cache.tilemap.get(key) as { format: number; data: Parameters<typeof applySeason>[0] };
			this.cache.tilemap.add(seasonal, { ...entry, data: applySeason(entry.data, season) });
		}
		return seasonal;
	}

	/** FPS overlay and window.__fjord state, only with ?debug. Runs every frame. */
	private updateDebug() {
		if (!this.debugText) return;
		const p = this.player.mover.tile;
		this.debugText.setText(`${Math.round(this.game.loop.actualFps)} fps  ${this.target.map} ${p.x},${p.y}`);
		// Read by e2e tests and dev tooling.
		(window as unknown as { __fjord?: object }).__fjord = {
			map: this.target.map,
			season: this.services.season,
			daylight: this.dayNight.current,
			presence: this.services.presence.current,
			thomas: this.thomas.state,
			ghosts: this.ghosts.count,
			emoteWheel: this.wheel.open,
			prompt: this.prompt.text,
			tile: { ...p },
			facing: this.player.mover.facing,
			moving: this.player.mover.moving,
			dialogueOpen: this.dialogue.open,
			choices: this.dialogue.currentChoices,
			selected: this.dialogue.selectedChoice,
			blips: this.blips.played,
			stamps: [...this.progress.stamps],
			passportOpen: this.menu.currentView === "passport",
			menu: this.menu.currentView,
			audio: this.sound instanceof Phaser.Sound.WebAudioSoundManager ? this.sound.context.state : "none",
			camera: { x: this.cameras.main.worldView.x, y: this.cameras.main.worldView.y, zoom: this.scale.zoom },
		};
	}

	private handleEvents(events: MoverEvent[]) {
		for (const e of events) {
			if (e.type === "stepStarted" || e.type === "turned") {
				// Others see the tile the player is heading into, and which way they face.
				const to = e.type === "stepStarted" ? e.to : this.player.mover.destination;
				this.services.ghosts?.move(to.x, to.y, this.player.mover.facing);
			}
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

	/** Ola's field: one tile per day of the last weeks, crops as tall as the commits. */
	private plantField(area: Extract<MapObject, { type: "crops" }>, decal?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer) {
		const days = this.services.world.contributions;
		// Without live data the generator's sample crops stay.
		if (!decal || !days.length) return;
		const stages = area.stages.split(",").map(Number);
		fieldLevels(days, area.w).forEach((row, dy) => {
			if (dy >= area.h) return;
			row.forEach((level, dx) => {
				const x = area.x + dx;
				const y = area.y + dy;
				if (!level) decal.removeTileAt(x, y);
				else decal.putTileAt(stages[Math.min(level, stages.length) - 1], x, y);
			});
		});
	}

	/** The library's featured shelf: a spine per pinned repo, in its language colour. */
	private stockShelf(area: Extract<MapObject, { type: "books" }>) {
		const g = this.add.graphics().setDepth(-0.5);
		for (const s of spines(this.services.world.repos, area.w * TILE, area.h * TILE - 2)) {
			const x = area.x * TILE + s.x;
			const y = area.y * TILE + s.y;
			g.fillStyle(s.edge).fillRect(x, y, s.w, s.h);
			g.fillStyle(s.color).fillRect(x, y + 1, s.w - 1, s.h - 1);
		}
	}

	/**
	 * What interact would use: the tile ahead, or across a counter, Pokémon style (up to
	 * two blocked tiles with nothing on them, and someone standing right behind).
	 */
	private targetAhead(): Point {
		const { tile, facing } = this.player.mover;
		const ahead = neighbour(tile, facing);
		const isCounter = (p: Point) => !this.npcAt(p) && !this.signs.has(tileKey(p)) && !this.grid.isWalkable(p.x, p.y, PLAYER_ID);
		for (let p = ahead, depth = 0; depth < 2 && isCounter(p); depth++) {
			p = neighbour(p, facing);
			if (this.npcAt(p)) return p;
		}
		return ahead;
	}

	private interactAhead() {
		const target = this.targetAhead();
		// A door ahead: interact walks through it, as the prompt promises.
		if (this.doors.has(tileKey(target)) && !this.npcAt(target) && !this.signs.has(tileKey(target))) {
			this.handleEvents(this.player.mover.walk(this.player.mover.facing, false, (p) => this.grid.isWalkable(p.x, p.y, PLAYER_ID)));
			return;
		}
		this.interactWith(target);
	}

	/** The prompt over whatever the player faces, if it can be used. */
	private updatePrompt(device: InputDevice) {
		const target = this.player.mover.moving || this.path.length ? null : this.targetAhead();
		const npc = target && this.npcAt(target);
		this.thomas.quiet = npc?.def.id === THOMAS_ID;
		if (!target) return this.prompt.hide();
		if (npc) {
			const { sprite } = npc.actor;
			return this.prompt.show(npc.def.dialogue.endsWith("_asleep") ? "Wake" : "Talk", device, sprite.x + sprite.width / 2, npc.actor.headTop - 3);
		}
		const x = (target.x + 0.5) * TILE;
		if (this.signs.has(tileKey(target))) return this.prompt.show("Read", device, x, target.y * TILE - 1);
		if (this.doors.has(tileKey(target))) return this.prompt.show("Enter", device, x, target.y * TILE - 1);
		this.prompt.hide();
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
		if (sign?.dialogue) this.playKnot(sign.dialogue, null, () => this.save());
		else if (sign) this.dialogue.say(sign.text, null, () => this.dialogue.close());
	}

	/** Play an NPC's Ink knot beat by beat until it ends. */
	private talk(npc: NpcDef) {
		// Each NPC's own knot has their id. Another knot first (Thomas asleep) only counts
		// as talking to them if it leads there.
		const runner = this.registry.get(DIALOGUE_KEY) as DialogueRunner;
		const visits = runner.visits(npc.id);
		this.playKnot(npc.dialogue, npc, () => {
			if (runner.visits(npc.id) > visits) this.finishedTalking(npc.id);
			this.save();
		});
	}

	/**
	 * Play an Ink knot to its end: spoken by `npc` (portrait, name, voice), or narrated
	 * when `npc` is null (a sign reading live content).
	 */
	private playKnot(knot: string, npc: NpcDef | null, onEnd: () => void) {
		const runner = this.registry.get(DIALOGUE_KEY) as DialogueRunner;
		runner.start(knot);
		const step = () => {
			const beat = runner.next();
			if (beat.type === "line") {
				const gesture = beat.tags.includes("nod") ? "nod" : beat.tags.includes("shake") ? "shake" : null;
				// A `# speaker:` tag means someone else is talking: no portrait for them yet.
				// `# narration` is the narrator: no portrait, no name.
				const narration = beat.tags.includes("narration");
				const character = npc && !beat.speaker && !narration ? npc.character : null;
				const voice = voiceFor(character);
				const onChar = (text: string, i: number) => shouldBlip(text, i, voice.every) && this.blips.play(voice);
				const link = beat.tags.map(resolveLink).find((l) => l && !("error" in l));
				const next = link && !("error" in link) ? () => this.offerLink(link.url, link.label, step) : step;
				const name = narration ? null : (beat.speaker ?? (npc ? (rosterNpc(npc.id)?.name ?? npc.name) : null));
				this.dialogue.say(beat.text, name, next, { portrait: character, gesture, onChar });
			} else if (beat.type === "choices") {
				this.dialogue.choose(beat.choices, (i) => {
					runner.choose(i);
					step();
				});
			} else {
				this.dialogue.close();
				onEnd();
			}
		};
		step();
	}

	private get progress(): Progress {
		return this.registry.get(PROGRESS_KEY) as Progress;
	}

	/** Finishing a conversation with a place's main NPC stamps the passport. */
	private finishedTalking(npcId: string) {
		const result = this.progress.stamp(stampForNpc(npcId));
		if (!result.newStamp) return;
		playStamp(this.audioOut);
		this.stampToast.show(result.newStamp, result.stamps.length, this.progress.reducedMotion);
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
		const { tile, facing } = this.player.mover;
		const progress = this.progress;
		writeSave(browserStorage(), {
			map: this.target.map,
			x: tile.x,
			y: tile.y,
			facing: facing as Facing,
			stamps: progress.stamps,
			flags: progress.flags,
			dialogue: { main: (this.registry.get(DIALOGUE_KEY) as DialogueRunner).saveState() },
			settings: progress.settings,
		});
	}
}
