"use client";

// A kai game behind a React page: the game module downloads as soon as the page is
// interactive (dynamic import), and the page shows its own title screen meanwhile. The
// hook reports loading, and starts or continues the game when the page asks.
import { useEffect, useRef, useState } from "react";
import type { BootOptions, GameHandle } from "@datagutt/kai";

export type GamePhase = "loading" | "ready" | "playing" | "failed";

/** A game's own start function (such as Fjord Town's startFjordTown). */
export type StartGame = (parent: HTMLElement, options: Pick<BootOptions, "onProgress" | "onReady">) => GameHandle;

/** `load` imports the game module; keep it stable (a module-level function). */
export function useKaiGame(load: () => Promise<StartGame>) {
	const containerRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<GameHandle | null>(null);
	const [phase, setPhase] = useState<GamePhase>("loading");
	const [progress, setProgress] = useState(0);
	const [hasSave, setHasSave] = useState(false);

	useEffect(() => {
		let cancelled = false;
		load()
			.then((startGame) => {
				if (cancelled || !containerRef.current) return;
				const handle = startGame(containerRef.current, {
					onProgress: (p) => setProgress(p),
					onReady: () => setPhase((current) => (current === "loading" ? "ready" : current)),
				});
				handleRef.current = handle;
				setHasSave(handle.hasSave);
				// A shared deep link goes straight into the world.
				if (handle.deepLinked) setPhase("playing");
			})
			.catch((err) => {
				console.error("[game] failed to load", err);
				if (!cancelled) setPhase("failed");
			});
		return () => {
			cancelled = true;
			handleRef.current?.destroy();
			handleRef.current = null;
		};
	}, [load]);

	return {
		/** The element the game draws into. */
		containerRef,
		phase,
		/** Loading progress from 0 to 1. */
		progress,
		hasSave,
		/**
		 * Enter the world; `fresh` forgets the save first. Focus moves to the game: it ignores
		 * keys while a page control has focus.
		 */
		start(fresh: boolean) {
			containerRef.current?.focus({ preventScroll: true });
			handleRef.current?.start({ fresh });
			setPhase("playing");
		},
		/** Call it from the title's first gesture: browsers play sound only after one. */
		playTitleMusic() {
			handleRef.current?.playTitleMusic();
		},
	};
}
