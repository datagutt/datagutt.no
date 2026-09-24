// Entry point for the game. Framework-free: the Next.js page and the standalone dev
// harness both call bootGame() with a container element.
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { WorldScene } from "./scenes/WorldScene";
import { readWorldState, type WorldState } from "@datagutt/kai-live";
import { EMPTY_WORLD_STATE } from "../content/live";
import { browserStorage, clearSave, loadSave } from "./save/save";
import { computeViewport } from "./viewport";
import type { Point } from "./world/grid";
import type { Facing } from "@datagutt/kai/world/objects";
import { START_PLACE, place, placeFromSearch } from "../content/places";
import { resolveSeason, type Season } from "@datagutt/kai/world/season";
import { clock, monthNow } from "./world/dayNight";
import { GhostClient, ghostsDisabled, worldSocketUrl } from "@datagutt/kai-net/client";
import type { KaiPlugin } from "./plugins/api";
import type { Progress } from "./progress/Progress";
import type { KaiConfig } from "@datagutt/kai/schema";
import { Music } from "./audio/Music";
import { trackFor } from "./audio/playlist";

/** Where the World scene should put the player. */
export type WorldTarget = { map: string; spawn?: string; tile?: Point; facing?: Facing };

/**
 * Deep link first (`?at=<place>`), then the saved position, then the start place's entrance.
 * `deepLinked` lets the page skip the title screen.
 */
export function resolveStart(search: string): { target: WorldTarget; deepLinked: boolean; hasSave: boolean } {
	const save = loadSave(browserStorage());
	// Debug only: `?debug&map=<id>` opens any map at its first spawn (maps in progress).
	const params = new URLSearchParams(search);
	const debugMap = params.has("debug") ? params.get("map") : null;
	if (debugMap && /^[a-z0-9_-]+$/.test(debugMap)) return { target: { map: debugMap }, deepLinked: true, hasSave: save !== null };
	const linked = placeFromSearch(search);
	if (linked?.entrance) return { target: { ...linked.entrance }, deepLinked: true, hasSave: save !== null };
	if (save) return { target: { map: save.map, tile: { x: save.x, y: save.y }, facing: save.facing }, deepLinked: false, hasSave: true };
	return { target: { ...place(START_PLACE).entrance! }, deepLinked: false, hasSave: false };
}

/** What the game's dialogue functions can read: the live data, the player's progress. */
export type ExternalsContext = { world: WorldState; progress: Progress; services: GameServices };
/** The implementations of the game's Ink external functions, by name. */
export type Externals = Record<string, (...args: never[]) => unknown>;

export type BootOptions = {
	/** kai.json as the content build validated it (.kai/config.json). */
	config: KaiConfig;
	/** The game's own behaviour. */
	plugins?: KaiPlugin[];
	/** Binds the game's Ink external functions (its dialogue host names them). */
	externals?: (ctx: ExternalsContext) => Externals;
	/** URL prefix where the built game assets live. */
	assetBase?: string;
	/** Loading progress from 0 to 1. */
	onProgress?: (progress: number) => void;
	/** Called once everything needed for the first map has loaded. */
	onReady?: () => void;
	/** Start playing as soon as loading finishes instead of waiting for start(). */
	autoStart?: boolean;
};

export type GameHandle = {
	/**
	 * Enter the world. Safe to call before loading finishes; it starts when ready.
	 * `fresh` is the title's New game: the save is forgotten (settings kept) and the game
	 * brings the player in as on a first visit.
	 */
	start(options?: { fresh?: boolean }): void;
	/**
	 * The title's music. Call it from the title's first gesture (Press start): browsers
	 * play sound only after one, and Phaser unlocks its audio on the same gesture.
	 */
	playTitleMusic(): void;
	destroy(): void;
	/** The page was opened with a valid `?at=` link, so the title can be skipped. */
	deepLinked: boolean;
	/** A saved game exists (the title shows "Continue"). */
	hasSave: boolean;
};

export type GameServices = Required<Pick<BootOptions, "config" | "assetBase" | "plugins" | "externals">> & {
	onProgress: (progress: number) => void;
	onReady: () => void;
	/** Resolves when the player has asked to start. */
	startRequested: Promise<void>;
	start: WorldTarget;
	/** Live GitHub data embedded by the page; empty in the dev harness. */
	world: WorldState;
	/** The season outdoors: today's in the game's time zone, or `?debug&season=<name>`. */
	season: Season;
	/**
	 * A story night: the clock stays at 23:00, the sky is clear and the aurora is out, on
	 * every map until a plugin ends it.
	 */
	night: boolean;
	/** The "auto" effects setting found frames running slow this visit (fx/quality.ts). */
	autoLow: boolean;
	/** No save and no deep link: a first visit, which an intro can greet. */
	firstVisit: boolean;
	/** New game over a save: the story loaded from the save is replaced before the world starts. */
	fresh: boolean;
	/** Hours on the visitor's clock (0–24), or `?debug&time=<phase|HH:MM>`. */
	hours: () => number;
	/** The month on the visitor's clock (1–12), or `?debug&month=`. */
	month: () => number;
	/**
	 * Other visitors (the world socket), or null when switched off with `rx_off`. The World
	 * scene starts and stops it by the "Other visitors" setting.
	 */
	ghosts: GhostClient | null;
	/** The background music, one for the whole game so it plays on across maps. */
	music: Music;
};

export const SERVICES_KEY = "services";

export function bootGame(parent: HTMLElement, options: BootOptions): GameHandle {
	let requestStart!: () => void;
	const startRequested = new Promise<void>((resolve) => (requestStart = resolve));
	const { target, deepLinked, hasSave } = resolveStart(window.location.search);
	if (options.autoStart || deepLinked) requestStart();

	const assetBase = options.assetBase ?? "/game/";
	const services: GameServices = {
		assetBase,
		config: options.config,
		plugins: options.plugins ?? [],
		externals: options.externals ?? (() => ({})),
		onProgress: options.onProgress ?? (() => {}),
		onReady: options.onReady ?? (() => {}),
		startRequested,
		start: target,
		world: readWorldState(EMPTY_WORLD_STATE),
		season: resolveSeason(window.location.search, options.config.timezone),
		night: false,
		autoLow: false,
		fresh: false,
		firstVisit: (!hasSave && !deepLinked) || (new URLSearchParams(window.location.search).has("debug") && new URLSearchParams(window.location.search).has("intro")),
		hours: clock(window.location.search),
		month: monthNow(window.location.search),
		ghosts: ghostsDisabled(safeLocalStorage()) ? null : new GhostClient(worldSocketUrl(window.location)),
		music: new Music(() => {
			const sound = game.sound;
			return sound instanceof Phaser.Sound.WebAudioSoundManager ? { context: sound.context, destination: sound.destination } : null;
		}, assetBase),
	};
	const params = new URLSearchParams(window.location.search);
	const debug = params.has("debug");
	if (debug) {
		console.info(
			`[game] world state from ${services.world.fetchedAt}: ${services.world.repos.length} repos`,
			services.world.repos.map((r) => r.name),
		);
	}
	const stops: (() => void)[] = [];
	for (const plugin of services.plugins) {
		const booted = plugin.boot?.(services, params);
		if (booted?.start) requestStart();
		if (booted?.stop) stops.push(booted.stop);
	}

	const dpr = () => window.devicePixelRatio || 1;
	const initial = computeViewport(parent.clientWidth, parent.clientHeight, dpr());

	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent,
		pixelArt: true,
		backgroundColor: "#0b1320",
		banner: false,
		disableContextMenu: true,
		input: { gamepad: true },
		scale: {
			mode: Phaser.Scale.NONE,
			width: initial.width,
			height: initial.height,
			zoom: initial.zoom / dpr(),
			expandParent: false,
		},
		scene: [BootScene, PreloadScene, WorldScene],
		callbacks: {
			preBoot: (g) => g.registry.set(SERVICES_KEY, services),
		},
	});

	const fit = () => {
		const v = computeViewport(parent.clientWidth, parent.clientHeight, dpr());
		if (v.width === game.scale.width && v.height === game.scale.height && v.zoom / dpr() === game.scale.zoom) {
			return;
		}
		game.scale.zoom = v.zoom / dpr();
		game.scale.resize(v.width, v.height);
	};

	const observer = new ResizeObserver(fit);
	observer.observe(parent);
	// Moving the window to a screen with another pixel ratio does not resize the parent.
	let dprQuery: MediaQueryList | undefined;
	const watchDpr = () => {
		dprQuery?.removeEventListener("change", onDprChange);
		dprQuery = window.matchMedia(`(resolution: ${dpr()}dppx)`);
		dprQuery.addEventListener("change", onDprChange);
	};
	const onDprChange = () => {
		fit();
		watchDpr();
	};
	watchDpr();

	return {
		start(options) {
			if (options?.fresh) {
				clearSave(browserStorage());
				services.start = { ...place(START_PLACE).entrance! };
				services.firstVisit = true;
				services.fresh = true;
			}
			requestStart();
		},
		playTitleMusic() {
			const settings = loadSave(browserStorage())?.settings;
			if (!settings?.muted && settings?.music !== false) services.music.play(trackFor({ scene: "title" }));
		},
		deepLinked,
		hasSave,
		destroy() {
			for (const stop of stops) stop();
			services.music.destroy();
			observer.disconnect();
			dprQuery?.removeEventListener("change", onDprChange);
			game.destroy(true);
		},
	};
}

/** localStorage, or null where reading it throws (some private modes). */
function safeLocalStorage(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
