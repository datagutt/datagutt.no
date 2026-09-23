// Entry point for the game. Framework-free: the Next.js page and the standalone dev
// harness both call bootGame() with a container element.
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { WorldScene } from "./scenes/WorldScene";
import type { WorldState } from "../content/live";
import { readWorldState } from "./live/worldState";
import { browserStorage, loadSave } from "./save/save";
import { computeViewport } from "./viewport";
import type { Point } from "./world/grid";
import type { Facing } from "./world/objects";
import { START_PLACE, place, placeFromSearch } from "../content/places";

/** Where the World scene should put the player. */
export type WorldTarget = { map: string; spawn?: string; tile?: Point; facing?: Facing };

/**
 * Deep link first (`?at=office`), then the saved position, then the ferry dock.
 * `deepLinked` lets the page skip the title screen.
 */
export function resolveStart(search: string): { target: WorldTarget; deepLinked: boolean; hasSave: boolean } {
	const save = loadSave(browserStorage());
	// Debug only: `?debug&map=overworld` opens any map at its first spawn (maps in progress).
	const params = new URLSearchParams(search);
	const debugMap = params.has("debug") ? params.get("map") : null;
	if (debugMap && /^[a-z0-9_-]+$/.test(debugMap)) return { target: { map: debugMap }, deepLinked: true, hasSave: save !== null };
	const linked = placeFromSearch(search);
	if (linked?.entrance) return { target: { ...linked.entrance }, deepLinked: true, hasSave: save !== null };
	if (save) return { target: { map: save.map, tile: { x: save.x, y: save.y }, facing: save.facing }, deepLinked: false, hasSave: true };
	return { target: { ...place(START_PLACE).entrance! }, deepLinked: false, hasSave: false };
}

export type BootOptions = {
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
	/** Enter the world. Safe to call before loading finishes; it starts when ready. */
	start(): void;
	destroy(): void;
	/** The page was opened with a valid `?at=` link, so the title can be skipped. */
	deepLinked: boolean;
	/** A saved game exists (the title shows "Continue"). */
	hasSave: boolean;
};

export type GameServices = Required<Pick<BootOptions, "assetBase">> & {
	onProgress: (progress: number) => void;
	onReady: () => void;
	/** Resolves when the player has asked to start. */
	startRequested: Promise<void>;
	start: WorldTarget;
	/** Live GitHub data embedded by the page; empty in the dev harness. */
	world: WorldState;
};

export const SERVICES_KEY = "services";

export function bootGame(parent: HTMLElement, options: BootOptions = {}): GameHandle {
	let requestStart!: () => void;
	const startRequested = new Promise<void>((resolve) => (requestStart = resolve));
	const { target, deepLinked, hasSave } = resolveStart(window.location.search);
	if (options.autoStart || deepLinked) requestStart();

	const services: GameServices = {
		assetBase: options.assetBase ?? "/game/",
		onProgress: options.onProgress ?? (() => {}),
		onReady: options.onReady ?? (() => {}),
		startRequested,
		start: target,
		world: readWorldState(),
	};
	if (new URLSearchParams(window.location.search).has("debug")) {
		console.info(
			`[game] world state from ${services.world.fetchedAt}: ${services.world.repos.length} repos`,
			services.world.repos.map((r) => r.name),
		);
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
		start: requestStart,
		deepLinked,
		hasSave,
		destroy() {
			observer.disconnect();
			dprQuery?.removeEventListener("change", onDprChange);
			game.destroy(true);
		},
	};
}
