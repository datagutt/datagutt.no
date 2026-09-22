"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GameHandle } from "@/game/boot";

type Phase = "loading" | "ready" | "playing" | "failed";

/**
 * Hosts the game canvas behind the server-rendered title screen. The game module
 * starts downloading as soon as the page is interactive; Start enters the world.
 */
export function GameShell({ titleArt }: { titleArt: ReactNode }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<GameHandle | null>(null);
	const [phase, setPhase] = useState<Phase>("loading");
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		let cancelled = false;
		import("@/game/boot")
			.then(({ bootGame }) => {
				if (cancelled || !containerRef.current) return;
				handleRef.current = bootGame(containerRef.current, {
					onProgress: (p) => setProgress(p),
					onReady: () => setPhase((current) => (current === "loading" ? "ready" : current)),
				});
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
	}, []);

	const start = () => {
		handleRef.current?.start();
		setPhase("playing");
	};

	const playing = phase === "playing";

	return (
		<div className="fixed inset-0 overflow-hidden bg-[#0b1320]">
			<div
				ref={containerRef}
				className="absolute inset-0"
				role="application"
				aria-label="Fjord Town, a game version of datagutt's portfolio. The Journal link has the same content as plain text."
			/>

			<div
				className={`absolute inset-0 transition-opacity duration-700 ${playing ? "pointer-events-none opacity-0" : "opacity-100"}`}
				aria-hidden={playing}
			>
				{titleArt}
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-4 pb-[18vh] text-center">
					<div>
						<h1 className="font-pixel text-5xl uppercase tracking-[0.2em] text-[#e8f5e9] drop-shadow-[0_3px_0_#0b1320] sm:text-7xl">
							datagutt
						</h1>
						<p className="mt-3 font-pixel text-sm uppercase tracking-widest text-primary-300 sm:text-base">
							A portfolio you can walk around in
						</p>
					</div>
					<div className="flex flex-col items-center gap-3 sm:flex-row">
						<button
							type="button"
							onClick={start}
							disabled={phase !== "ready"}
							className="min-w-48 border-2 border-[#e8f5e9] bg-primary-700 px-6 py-3 font-pixel text-lg uppercase tracking-wider text-[#e8f5e9] shadow-[4px_4px_0_#0b1320] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
						>
							{phase === "failed"
								? "Could not load"
								: phase === "ready" || playing
									? "▶ Start"
									: `Loading ${Math.round(progress * 100)}%`}
						</button>
						<Link
							href="/journal"
							className="min-w-48 border-2 border-[#e8f5e9]/70 bg-[#0b1320]/70 px-6 py-3 font-pixel text-lg uppercase tracking-wider text-[#e8f5e9] shadow-[4px_4px_0_#0b1320] transition-transform hover:-translate-y-0.5"
						>
							Journal
						</Link>
					</div>
					{phase === "failed" && (
						<p className="max-w-sm font-sans text-sm text-[#e8f5e9]">
							The game could not start in this browser. Everything is in the Journal.
						</p>
					)}
				</div>
			</div>

			{playing && (
				<Link
					href="/journal"
					className="absolute right-3 top-3 border-2 border-[#e8f5e9]/70 bg-[#0b1320]/80 px-3 py-1.5 font-pixel text-xs uppercase tracking-wider text-[#e8f5e9] md:hidden"
				>
					Journal
				</Link>
			)}
		</div>
	);
}
