import Phaser from "phaser";
import { SERVICES_KEY, type GameServices, type WorldTarget } from "../boot.ts";
import { TILE } from "../constants.ts";
import { Actor } from "../entities/Actor.ts";
import { GhostLayer } from "../entities/Ghosts.ts";
import { EmoteWheel } from "../ui/EmoteWheel.ts";
import { Prompt } from "../ui/Prompt.ts";
import { EmoteBubble } from "../ui/Bubbles.ts";
import { SimulatedGhosts } from "../dev/simulatedGhosts.ts";
import { InputController, type FrameInput, type InputDevice } from "../input/InputController.ts";
import { browserStorage, writeSave } from "../save/save.ts";
import { playBump, playPaper, playStamp, playTick, type AudioOutput } from "../audio/sfx.ts";
import type { KaiPlugin, NpcDef, ObjectOf, Takeover, TileLayer, Usable, World } from "../plugins/api.ts";
import { PROGRESS_KEY, type Progress } from "../progress/Progress.ts";
import { StampToast } from "../ui/Passport.ts";
import { MenuButton, StartMenu } from "../ui/StartMenu.ts";
import { BlipPlayer, shouldBlip } from "../audio/blips.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { LinkOpener } from "../ui/LinkOpener.ts";
import type { DialogueRunner } from "../dialogue/DialogueRunner.ts";
import { DIALOGUE_KEY } from "./PreloadScene.ts";
import { CollisionGrid, directionBetween, neighbour, type Point } from "../world/grid.ts";
import { NPC_MOVEMENT, PLAYER_MOVEMENT, type MoverEvent } from "../world/movement.ts";
import {
	areaObject,
	doorObject,
	gateObject,
	lightObject,
	mapObjectTypes,
	npcObject,
	signObject,
	spawnObject,
	spotObject,
	spriteObject,
	type AnyMapObject,
	type Facing,
	type GateObject,
	type LightObject,
	type ObjectPlacer,
	type SpriteObject,
	type TiledObject,
} from "../world/objects.ts";
import { addLights } from "../fx/Lights.ts";
import { DayNight } from "../fx/DayNight.ts";
import { Weather } from "../fx/Weather.ts";
import { Water } from "../fx/Water.ts";
import { Aurora } from "../fx/Aurora.ts";
import { Ambience } from "../audio/Ambience.ts";
import { ambienceMix } from "../audio/mix.ts";
import { distanceField, FAR } from "../world/distance.ts";
import { Feel } from "../fx/Feel.ts";
import { FrameWatch, qualityFor, type Quality } from "../fx/quality.ts";
import { findPath, findPathAdjacent } from "../world/pathfind.ts";
import { lightFactor } from "../world/dayNight.ts";
import { applySeason } from "../world/season.ts";
import { resolveWeather, weatherSound } from "../world/weather.ts";
import { calmWeather, type WeatherNow } from "../world/weather-kinds.ts";

type Door = ObjectOf<"door">;
type Sign = ObjectOf<"sign">;

const PLAYER_ID = "player";
/** The roof layers' depth: over every character. */
const ABOVE_DEPTH = 50_000;
const tileKey = (p: Point) => `${p.x},${p.y}`;
/** Registry key of the game-wide Ambience. */
const AMBIENCE_KEY = "ambience";
/** Tap-to-move runs when the path is at least this long. */
const RUN_PATH_LENGTH = 7;

export class WorldScene extends Phaser.Scene {
	private target!: WorldTarget;
	private services!: GameServices;
	private grid!: CollisionGrid;
	private player!: Actor;
	private npcs = new Map<string, { actor: Actor; def: NpcDef }>();
	/** NPCs a plugin moves and syncs itself. */
	private managed = new Set<string>();
	private dayNight!: DayNight;
	private weather: Weather | null = null;
	/** The visitor's weather, or the debug override; it rains on indoor maps too, for the ambience. */
	private weatherNow!: WeatherNow;
	private water: Water | null = null;
	private aurora: Aurora | null = null;
	private prompt!: Prompt;
	private feel!: Feel;
	private readonly frameWatch = new FrameWatch();
	/** A plugin has the frame (a cutscene, a cabinet, the credits). */
	private takeover: Takeover | null = null;
	private kaiPlugins: KaiPlugin[] = [];
	private world!: World;
	private spawns = new Map<string, ObjectOf<"spawn">>();
	private spots = new Map<string, ObjectOf<"spot">>();
	private areas = new Map<string, ObjectOf<"area">>();
	private sprites: { def: SpriteObject; sprite: Phaser.GameObjects.Sprite }[] = [];
	private layers = new Map<string, TileLayer>();
	private outdoors = false;
	private start: Point = { x: 0, y: 0 };
	/** The NPC under the interaction prompt. */
	private promptNpc: string | null = null;
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
	private ambience!: Ambience;
	/** Distance fields for the ambience, and when it was last updated. */
	private surroundings!: { water: Uint16Array; forest: Uint16Array; fires: Point[]; outdoors: boolean };
	private ambienceAt = 0;
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
		this.kaiPlugins = this.services.plugins;
		this.npcs = new Map();
		this.managed = new Set();
		this.doors = new Map();
		this.signs = new Map();
		this.spawns = new Map();
		this.spots = new Map();
		this.areas = new Map();
		this.sprites = [];
		this.layers = new Map();
		this.takeover = null;
		this.promptNpc = null;
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
		const layers = this.layers;
		for (const layerData of map.layers) {
			const layer = map.createLayer(layerData.name, tileset);
			if (!layer) continue;
			layers.set(layerData.name, layer);
			const collisionOnly = layerData.name === "collision" || layerData.name === "manual_collision";
			// Hidden data layers: open water for the water shader, water and forest for the ambience.
			if (layerData.name === "water" || layerData.name === "forest") {
				layer.setVisible(false);
				continue;
			}
			layer.setVisible(!collisionOnly);
			layer.setDepth(layerData.name.includes("above") ? ABOVE_DEPTH : -1);
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

		this.outdoors = (map.properties as { name: string; value: unknown }[] | undefined)?.some((p) => p.name === "outdoor" && p.value === "true") ?? false;
		this.world = this.makeWorld();
		// Generated `objects` plus any `manual_*` object layers added in Tiled.
		const rawObjects = map.objects.flatMap((layer) => layer.objects) as unknown as TiledObject[];
		// The engine's own types, plus those the plugins place (the first plugin to name a type places it).
		const placers = new Map<string, ObjectPlacer>();
		for (const placer of this.kaiPlugins.flatMap((p) => p.objects ?? [])) if (!placers.has(placer.type.type)) placers.set(placer.type.type, placer);
		const types = mapObjectTypes([...placers.values()].map((p) => p.type));
		const lights: LightObject[] = [];
		const signs: Sign[] = [];
		const gates: GateObject[] = [];
		const placed: AnyMapObject[] = [];
		for (const raw of rawObjects) {
			if (!types.has(raw.type)) {
				console.warn(`[world] ${this.target.map}: no plugin places "${raw.type}" objects`);
				continue;
			}
			const obj = types.get(raw.type)!.parse(raw, TILE);
			if (spawnObject.is(obj)) this.spawns.set(obj.id, obj);
			else if (spotObject.is(obj)) this.spots.set(obj.id, obj);
			else if (areaObject.is(obj)) this.areas.set(obj.id, obj);
			else if (spriteObject.is(obj)) this.placeSprite(obj);
			else if (doorObject.is(obj)) {
				// A locked warp is solid ground until it opens, whatever the map around it
				// allows: nobody slips round a gate onto it.
				if (obj.unlock && !this.gameData.isUnlocked(obj.unlock, this.progress)) this.grid.setBlocked(obj.x, obj.y);
				else this.doors.set(tileKey(obj), obj);
			} else if (signObject.is(obj)) signs.push(obj);
			else if (gateObject.is(obj)) gates.push(obj);
			else if (lightObject.is(obj)) lights.push(obj);
			else if (npcObject.is(obj)) {
				const actor = new Actor(this, obj.id, obj.character, obj, obj.facing, NPC_MOVEMENT);
				this.npcs.set(obj.id, { actor, def: obj });
				this.grid.occupy(obj.x, obj.y, obj.id);
			} else placed.push(obj);
		}
		for (const obj of placed) placers.get(obj.type)!.place(this.world, obj);
		// A shut gate reads like a sign; an open one clears its barriers off the map.
		for (const gate of gates) {
			if (!this.gameData.isUnlocked(gate.unlock, this.progress)) {
				signs.push({ type: "sign", x: gate.x, y: gate.y, w: gate.w, h: gate.h, text: gate.text });
				continue;
			}
			for (let y = gate.y; y < gate.y + gate.h; y++) {
				for (let x = gate.x; x < gate.x + gate.w; x++) {
					for (const name of ["below", "above"]) layers.get(name)?.removeTileAt(x, y);
					this.grid.setBlocked(x, y, false);
				}
			}
		}
		// A sign reads from any solid tile of the thing it describes (world/gen/signs.ts).
		for (const sign of signs) {
			for (let y = sign.y; y < sign.y + (sign.h ?? 1); y++) {
				for (let x = sign.x; x < sign.x + (sign.w ?? 1); x++) {
					if (!this.grid.isWalkable(x, y) || (sign.w === undefined && sign.h === undefined)) this.signs.set(tileKey({ x, y }), sign);
				}
			}
		}

		const images = addLights(this, lights, this.progress.reducedMotion);
		const outdoors = this.outdoors;
		// A story night stays at night, under a clear sky, whatever the clock and the weather.
		const hours = this.services.night ? () => 23 : this.services.hours;
		this.dayNight = new DayNight(this, lights.map((light, i) => ({ light, image: images[i] })), outdoors, hours, this.services.month);
		this.showSpritesByDaylight();
		const low = this.quality === "low";
		const weather = this.services.live.weather;
		this.weatherNow = this.services.night ? calmWeather(weather.place) : resolveWeather(window.location.search, weather);
		this.weather = outdoors ? new Weather(this, this.services.season, this.weatherNow, this.progress.reducedMotion, low) : null;
		const clearSky = this.weatherNow.kind === "clear";
		this.aurora = outdoors && !low && clearSky ? Aurora.create(this, this.services.season, this.progress.reducedMotion) : null;
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.aurora?.destroy());
		this.water = low ? null : Water.create(this, map.getLayer("water") ?? undefined, () => this.dayNight.current, () => this.aurora?.strength ?? 0);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.water?.destroy());
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.weather?.destroy());

		const spawn = this.target.spawn ? this.spawns.get(this.target.spawn) : undefined;
		const startAt = this.target.tile ?? spawn ?? [...this.spawns.values()][0];
		if (!startAt) throw new Error(`Map ${this.target.map} has no spawn point`);
		const start = { x: startAt.x, y: startAt.y };
		this.start = start;
		const facing = this.target.facing ?? spawn?.facing ?? "down";
		this.player = new Actor(this, PLAYER_ID, "player", start, facing, PLAYER_MOVEMENT);
		this.grid.occupy(start.x, start.y, PLAYER_ID);

		// Other visitors: this map's room, joined at the player's tile.
		this.ghosts = new GhostLayer(this, this.target.map);
		const client = this.services.ghosts;
		const unsubscribe = client?.subscribe((m) => this.ghosts.handle(m));
		this.wheel = new EmoteWheel(this);
		this.prompt = new Prompt(this, this.gameData);
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
		// One ambience for the whole game, so it carries on (and crossfades) across maps.
		let ambience = this.registry.get(AMBIENCE_KEY) as Ambience | undefined;
		if (!ambience) {
			const sound = this.sound;
			ambience = new Ambience(() =>
				sound instanceof Phaser.Sound.WebAudioSoundManager ? { context: sound.context, destination: sound.destination } : null,
			);
			this.registry.set(AMBIENCE_KEY, ambience);
		}
		this.ambience = ambience;
		this.audioOut = ambience.effects;
		this.surroundings = this.measureSurroundings(map, lights, outdoors);
		this.blips = new BlipPlayer(this.audioOut);
		this.menuButton = new MenuButton(this, this.gameData);
		this.menu = new StartMenu(this, this.gameData, {
			stamps: () => this.progress.stamps,
			achievements: () => this.gameData.achievements.filter((a) => this.progress.hasAchievement(a.id)).map((a) => a.id),
			settings: () => {
				const { muted, music, reducedMotion, showVisitors, effects } = this.progress.settings;
				return { muted, music, reducedMotion, showVisitors, effects };
			},
			changeSettings: (next) => {
				const effectsChanged = next.effects !== this.progress.settings.effects;
				this.progress.settings = { ...this.progress.settings, ...next };
				this.sound.mute = next.muted;
				this.applyVisitors();
				this.save();
				if (effectsChanged) this.applyQuality();
			},
			items: () => this.kaiPlugins.flatMap((p) => p.menuItems?.(this.world) ?? []),
			sound: (kind) => (kind === "open" ? playPaper(this.audioOut) : playTick(this.audioOut, kind === "select" ? 660 : 880)),
		});
		this.stampToast = new StampToast(this, this.gameData);
		this.fitCamera();
		this.feel = new Feel(this, this.player, () => this.progress.reducedMotion);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.feel.destroy());
		for (const plugin of this.kaiPlugins) plugin.mapCreated?.(this.world);
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
		this.aurora?.resize(size.width, size.height);
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
		this.showSpritesByDaylight();
		if (this.progress.settings.effects === "auto" && this.frameWatch.sample(delta)) {
			// Struggling: the shaders go now, the weather thins on the next map.
			this.services.autoLow = true;
			this.applyQuality();
		}
		this.water?.update();
		this.aurora?.update(this.dayNight.current.dark, this.services.night);
		this.updateAmbience(time);
		this.weather?.update(this.dayNight.current.dark);
		if (this.transitioning || this.menu.open || this.dialogue.open || this.wheel.open || this.takeover) this.prompt.hide();
		this.updateDebug();

		if (this.transitioning) return;
		// A takeover pauses while it has dialogue on screen (a cutscene's conversation).
		if (this.takeover && !this.dialogue.open) {
			const takeover = this.takeover;
			if (!takeover.update(dt, input) && this.takeover === takeover) this.takeover = null;
			if (takeover.syncNpcs) this.syncNpcs();
			else this.player.sync();
			return;
		}
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
		this.syncNpcs();
		for (const plugin of this.kaiPlugins) plugin.update?.(this.world, dt, time);
		this.simulated?.update(dt);
		this.ghosts.update(dt, time, this.player.mover.tile);
		this.updateSelfEmote(time);
		this.updatePrompt(input.device);
		this.feel.update();

	}

	/** The map NPCs' sprites follow their movers; plugins sync the NPCs they manage. */
	private syncNpcs() {
		for (const [id, { actor }] of this.npcs) if (!this.managed.has(id)) actor.sync();
	}

	/** How far the sea, the forest and any fire are from every tile, for the ambience. */
	private measureSurroundings(map: Phaser.Tilemaps.Tilemap, lights: LightObject[], outdoors: boolean) {
		const field = (name: string, open?: (t: Phaser.Tilemaps.Tile) => boolean) => {
			const layer = map.getLayer(name);
			return distanceField(map.width, map.height, (x, y) => {
				const tile = layer?.data[y][x];
				return Boolean(tile && tile.index >= 0 && (!open || open(tile)));
			});
		};
		return {
			water: field("water", (t) => Boolean(t.properties?.collides)),
			forest: field("forest"),
			// Fires are the flickering glows (world/art/lighting.ts GLOWS.fire).
			fires: lights.filter((l) => l.shape === "glow" && l.flicker).map((l) => ({ x: l.x, y: l.y })),
			outdoors,
		};
	}

	/** A few times a second: the ambience for where the player stands, and the music. */
	private updateAmbience(time: number) {
		if (time < this.ambienceAt) return;
		this.ambienceAt = time + 250;
		const { x, y } = this.player.mover.tile;
		const s = this.surroundings;
		const at = (field: Uint16Array) => (field[y * this.mapWidth + x] === FAR ? Infinity : field[y * this.mapWidth + x]);
		const fire = Math.min(Infinity, ...s.fires.map((f) => Math.abs(f.x - x) + Math.abs(f.y - y)));
		this.ambience.set(
			ambienceMix({
				outdoors: s.outdoors,
				water: at(s.water),
				forest: at(s.forest),
				fire,
				dark: this.dayNight.current.dark,
				season: this.services.season,
				weather: weatherSound(this.weatherNow),
			}),
		);
		const { muted, music } = this.progress.settings;
		const moment =
			this.takeover?.music === "credits"
				? ({ scene: "credits" } as const)
				: { scene: "world" as const, map: this.target.map, outdoors: s.outdoors, phase: this.dayNight.current.phase, season: this.services.season, night: this.services.night };
		// Muted or switched off: nothing plays, and nothing downloads.
		this.services.music.play(muted || !music ? null : this.gameData.trackFor(moment));
	}

	private get quality(): Quality {
		return qualityFor(this.progress.settings.effects, this.services.autoLow);
	}

	/** Effects quality changed: drop the shaders now, or rebuild the scene to add them back. */
	private applyQuality() {
		if (this.quality === "low") {
			this.water?.destroy();
			this.aurora?.destroy();
			this.water = this.aurora = null;
			return;
		}
		if (!this.water && !this.aurora && !this.transitioning && !this.dialogue.open) {
			const t = this.player.mover.destination;
			this.goTo({ map: this.target.map, tile: t, facing: this.player.mover.facing });
		}
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
		this.wheel.show(this.player.centerX - cam.worldView.x, this.player.headTop - 8 - cam.worldView.y, (emote) => {
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
		this.selfEmote.update(time, this.player.centerX, this.player.headTop);
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

	/** FPS overlay and window.__kai state, only with ?debug. Runs every frame. */
	private updateDebug() {
		if (!this.debugText) return;
		const p = this.player.mover.tile;
		this.debugText.setText(`${Math.round(this.game.loop.actualFps)} fps  ${this.target.map} ${p.x},${p.y}`);
		// Read by e2e tests and dev tooling.
		(window as unknown as { __kai?: object }).__kai = {
			map: this.target.map,
			season: this.services.season,
			weather: this.weatherNow.kind,
			daylight: this.dayNight.current,
			quality: this.quality,
			ambience: this.ambience.levels,
			/** Animated sprites on screen now, by name: seasonal and day-only ones come and go. */
			sprites: this.sprites.filter(({ sprite }) => sprite.visible).map(({ def }) => def.sprite),
			music: this.services.music.current,
			ghosts: this.ghosts.count,
			emoteWheel: this.wheel.open,
			takeover: this.takeover?.name ?? null,
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
			...Object.assign({}, ...this.kaiPlugins.map((p) => p.debug?.(this.world) ?? {})),
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
				this.feel.step(e.from);
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
				const ahead = neighbour(this.player.mover.tile, e.facing);
				if (ahead.x < 0 || ahead.y < 0 || ahead.x >= this.mapWidth || ahead.y >= this.mapHeight) {
					for (const plugin of this.kaiPlugins) plugin.bumpedEdge?.(this.world);
				}
				this.clearPath();
				this.feel.bump(e.facing);
				playBump(this.audioOut);
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
		if (npc || sign || this.usableAt(target)) {
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

	/**
	 * What interact would use: the tile ahead, or across a counter, Pokémon style (up to
	 * two blocked tiles with nothing on them, and someone standing right behind).
	 */
	private targetAhead(): Point {
		const { tile, facing } = this.player.mover;
		const ahead = neighbour(tile, facing);
		const isCounter = (p: Point) => !this.npcAt(p) && !this.signs.has(tileKey(p)) && !this.usableAt(p) && !this.grid.isWalkable(p.x, p.y, PLAYER_ID);
		for (let p = ahead, depth = 0; depth < 2 && isCounter(p); depth++) {
			p = neighbour(p, facing);
			if (this.npcAt(p)) return p;
		}
		return ahead;
	}

	private interactAhead() {
		const target = this.targetAhead();
		// A door ahead: interact walks through it, as the prompt promises.
		if (this.doors.has(tileKey(target)) && !this.npcAt(target) && !this.signs.has(tileKey(target)) && !this.usableAt(target)) {
			this.handleEvents(this.player.mover.walk(this.player.mover.facing, false, (p) => this.grid.isWalkable(p.x, p.y, PLAYER_ID)));
			return;
		}
		this.interactWith(target);
	}

	/** The prompt over whatever the player faces, if it can be used. */
	private updatePrompt(device: InputDevice) {
		const target = this.player.mover.moving || this.path.length ? null : this.targetAhead();
		const npc = target && this.npcAt(target);
		this.promptNpc = npc ? npc.def.id : null;
		if (!target) return this.prompt.hide();
		if (npc) {
			const action = this.kaiPlugins.map((p) => p.promptFor?.(this.world, npc.def)).find(Boolean) ?? "Talk";
			return this.prompt.show(action, device, npc.actor.centerX, npc.actor.headTop - 3);
		}
		const x = (target.x + 0.5) * TILE;
		const usable = this.usableAt(target);
		if (usable) return this.prompt.show(usable.prompt, device, x, target.y * TILE - 1);
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
		const usable = this.usableAt(p);
		if (usable) {
			this.clearPath();
			return usable.use();
		}
		const sign = this.signs.get(tileKey(p));
		if (sign?.dialogue) this.playKnot(sign.dialogue, null, () => this.save());
		else if (sign) this.dialogue.say(sign.text, null, () => this.dialogue.close());
	}

	/** Earn an achievement once: a banner (unless `announce` is false) and a save. */
	private achieve(id: string, announce = true) {
		if (!this.progress.achieve(id)) return;
		if (announce) this.stampToast.showAchievement(this.gameData.achievement(id).name, this.progress.reducedMotion);
		this.save();
	}

	/** A looping strip from kai.json `sprites`; with reduced motion it holds its first frame. */
	private placeSprite(def: SpriteObject) {
		const key = `sprite:${def.sprite}`;
		if (def.seasons && !def.seasons.split(",").includes(this.services.season)) return;
		if (!this.textures.exists(key)) {
			console.warn(`[world] ${this.target.map}: no sprite "${def.sprite}" in kai.json sprites`);
			return;
		}
		const sprite = this.add.sprite(def.x * TILE + (def.dx ?? 0), def.y * TILE + (def.dy ?? 0), key).setOrigin(0);
		// Just over its tile layer (the ground, or the roofs); otherwise sorted with the characters by its bottom edge.
		sprite.setDepth(def.layer === "below" ? -0.9 : def.layer === "above" ? ABOVE_DEPTH + 0.1 : sprite.y + sprite.height);
		// Neighbours start at different frames, so a flock doesn't move in step.
		const frames = sprite.texture.frameTotal - 1;
		const start = (def.x * 7 + def.y * 13) % Math.max(1, frames);
		if (this.progress.reducedMotion) sprite.setFrame(0);
		else sprite.play({ key, startFrame: start });
		this.sprites.push({ def, sprite });
	}

	/** Day-only and night-only sprites come and go with the light, as their lights do. */
	private showSpritesByDaylight() {
		const { dark } = this.dayNight.current;
		for (const { def, sprite } of this.sprites) {
			if (def.when === "day" || def.when === "night") sprite.setVisible(lightFactor(def.when, dark) >= 0.5);
		}
	}

	/** What a plugin lets the player use on `p`, if anything. */
	private usableAt(p: Point): Usable | null {
		for (const plugin of this.kaiPlugins) {
			const usable = plugin.usableAt?.(this.world, p);
			if (usable) return usable;
		}
		return null;
	}

	/** Play an NPC's Ink knot beat by beat until it ends. */
	private talk(npc: NpcDef) {
		if (this.kaiPlugins.some((p) => p.talk?.(this.world, npc))) return;
		// Each NPC's own knot has their id. Another knot first (someone asleep) only counts
		// as talking to them if it leads there.
		const runner = this.registry.get(DIALOGUE_KEY) as DialogueRunner;
		const visits = runner.visits(npc.id);
		const knot = npc.dialogue;
		this.playKnot(knot, npc, () => {
			const reached = runner.visits(npc.id) > visits;
			for (const plugin of this.kaiPlugins) plugin.talked?.(this.world, npc, knot, reached);
			if (reached) this.finishedTalking(npc.id);
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
				const voice = this.gameData.voiceFor(character);
				const onChar = (text: string, i: number) => shouldBlip(text, i, voice.every) && this.blips.play(voice);
				const link = beat.tags.map(this.services.links).find((l) => l && !("error" in l));
				const next = link && !("error" in link) ? () => this.offerLink(link.url, link.label, step) : step;
				const name = narration ? null : (beat.speaker ?? (npc ? (this.gameData.npc(npc.id)?.name ?? npc.name) : null));
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

	private get gameData() {
		return this.services.data;
	}

	private get progress(): Progress {
		return this.registry.get(PROGRESS_KEY) as Progress;
	}

	/** Finishing a conversation with a place's main NPC stamps the passport. */
	private finishedTalking(npcId: string) {
		const result = this.progress.stamp(this.gameData.stampForNpc(npcId));
		if (!result.newStamp) return;
		playStamp(this.audioOut);
		this.feel.shake();
		this.stampToast.show(result.newStamp, result.stamps.length, this.progress.reducedMotion);
		for (const plugin of this.kaiPlugins) plugin.stamped?.(this.world, result.newStamp, result.complete);
	}

	/** "Open github.com?" after a line with a `# link:` tag. */
	private offerLink(url: string, label: string, then: () => void) {
		this.links.arm(url);
		this.dialogue.choose([this.gameData.t("link.open", { label }), this.gameData.t("link.notNow")], (i) => {
			if (i === 0) this.links.confirm();
			else this.links.disarm();
			then();
		});
	}

	private enterDoor(door: Door) {
		this.transitioning = true;
		this.clearPath();
		this.feel.squash();
		this.goTo({ map: door.toMap, spawn: door.toSpawn });
	}

	/** Fade out and restart the scene on another map (or spot). */
	private goTo(target: WorldTarget, fadeMs = 160) {
		this.transitioning = true;
		const cam = this.cameras.main;
		cam.fadeOut(fadeMs, 11, 19, 32);
		cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(target));
	}

	/** The world as plugins see it: live views of this scene's state. */
	private makeWorld(): World {
		const scene = this;
		return {
			scene,
			get map() {
				return scene.target.map;
			},
			get outdoors() {
				return scene.outdoors;
			},
			get grid() {
				return scene.grid;
			},
			get player() {
				return scene.player;
			},
			get services() {
				return scene.services;
			},
			get progress() {
				return scene.progress;
			},
			get daylight() {
				return scene.dayNight.current;
			},
			layers: scene.layers,
			spawns: scene.spawns,
			spots: scene.spots,
			areas: scene.areas,
			sprites: scene.sprites,
			doors: scene.doors,
			get arrival() {
				return { target: scene.target, tile: scene.start };
			},
			get dialogueOpen() {
				return scene.dialogue.open;
			},
			get promptNpc() {
				return scene.promptNpc;
			},
			addNpc(def, actor, options) {
				scene.npcs.set(def.id, { actor, def });
				if (options?.managed) scene.managed.add(def.id);
			},
			removeNpc(id) {
				scene.npcs.delete(id);
				scene.managed.delete(id);
			},
			npc: (id) => scene.npcs.get(id),
			playKnot: (knot, npc, onEnd) => scene.playKnot(knot, npc, onEnd),
			achieve: (id, announce) => scene.achieve(id, announce),
			save: () => scene.save(),
			goTo: (target, fadeMs) => scene.goTo(target, fadeMs),
			takeOver(takeover) {
				scene.clearPath();
				scene.takeover = takeover;
			},
			clearPath: () => scene.clearPath(),
			onShutdown: (fn) => scene.events.once(Phaser.Scenes.Events.SHUTDOWN, fn),
		};
	}

	private save() {
		const { tile, facing } = this.player.mover;
		const progress = this.progress;
		writeSave(browserStorage(), this.services.config.saveKey, {
			map: this.target.map,
			x: tile.x,
			y: tile.y,
			facing: facing as Facing,
			stamps: progress.stamps,
			flags: progress.flags,
			records: progress.records,
			dialogue: { main: (this.registry.get(DIALOGUE_KEY) as DialogueRunner).saveState() },
			settings: progress.settings,
		});
	}
}
