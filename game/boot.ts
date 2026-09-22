// Entry point for the game. Framework-free: the Next.js page and the standalone dev
// harness both call bootGame() with a container element.
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { WorldScene } from "./scenes/WorldScene";
import { computeViewport } from "./viewport";

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
};

export type GameServices = Required<Pick<BootOptions, "assetBase">> & {
	onProgress: (progress: number) => void;
	onReady: () => void;
	/** Resolves when the player has asked to start. */
	startRequested: Promise<void>;
};

export const SERVICES_KEY = "services";

export function bootGame(parent: HTMLElement, options: BootOptions = {}): GameHandle {
	let requestStart!: () => void;
	const startRequested = new Promise<void>((resolve) => (requestStart = resolve));
	if (options.autoStart) requestStart();

	const services: GameServices = {
		assetBase: options.assetBase ?? "/game/",
		onProgress: options.onProgress ?? (() => {}),
		onReady: options.onReady ?? (() => {}),
		startRequested,
	};

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
		destroy() {
			observer.disconnect();
			dprQuery?.removeEventListener("change", onDprChange);
			game.destroy(true);
		},
	};
}
