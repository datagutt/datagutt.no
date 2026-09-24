"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useKaiGame } from "@datagutt/kai-next/game";
import { useMenuKeys } from "@datagutt/kai-next/menu-keys";
import { credits } from "@/content/credits";

/** Where the title screen is: the "Press start" splash, its menu, or a page off the menu. */
type Screen = "splash" | "menu" | "confirm" | "credits";

const loadGame = () => import("@/game").then((game) => game.startFjordTown);

const JOURNAL_LABEL = "Read it as a normal website";

/**
 * Hosts the game canvas behind the server-rendered title screen (docs/PLAN.md M5.11).
 * The game module starts downloading as soon as the page is interactive. "Press start"
 * opens the menu straight away; picking a way in waits for loading to finish.
 */
export function GameShell({ titleArt }: { titleArt: ReactNode }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const [screen, setScreen] = useState<Screen>("splash");
	const { containerRef, phase, progress, hasSave, start, playTitleMusic } = useKaiGame(loadGame);
	const playing = phase === "playing";

	useMenuKeys({
		enabled: !playing,
		splash: screen === "splash",
		menuRef,
		openMenu: useCallback(() => setScreen("menu"), []),
		back: useCallback(() => setScreen((current) => (current === "menu" ? "splash" : "menu")), []),
	});

	// Each page of the menu starts with its first item under the cursor.
	useEffect(() => {
		const menu = menuRef.current;
		if (screen === "splash" || !menu || menu.contains(document.activeElement)) return;
		menu.querySelector<HTMLElement>("[data-menu-item]")?.focus();
	}, [screen, hasSave]);

	// Press start is the page's first gesture, and browsers play sound only after one, so the
	// title music starts with the menu (or once the game has loaded, if that comes later).
	useEffect(() => {
		if (screen !== "splash" && phase !== "playing") playTitleMusic();
	}, [screen, phase, playTitleMusic]);

	// Parallax: the backdrop's layers lean away from the pointer (TitleArt.tsx).
	useEffect(() => {
		const root = rootRef.current;
		if (playing || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== "mouse") return;
			root.style.setProperty("--title-x", ((0.5 - e.clientX / window.innerWidth) * 2).toFixed(3));
			root.style.setProperty("--title-y", ((0.5 - e.clientY / window.innerHeight) * 2).toFixed(3));
		};
		window.addEventListener("pointermove", onMove);
		return () => window.removeEventListener("pointermove", onMove);
	}, [playing]);

	// Focus moves from the menu to the game, and Tab from the game goes on to the Journal
	// link after it.
	const enter = (fresh: boolean) => start(fresh);

	const ready = phase === "ready";
	const loadingLabel = phase === "failed" ? "Could not load" : `Loading ${Math.round(progress * 100)}%`;

	return (
		<div ref={rootRef} className="fixed inset-0 overflow-hidden bg-[#3f7fe0]">
			<div
				ref={containerRef}
				tabIndex={-1}
				className="absolute inset-0 outline-none"
				role="application"
				aria-label="Fjord Town, a game version of datagutt's portfolio. The Journal link after it has the same content as a normal web page."
			/>
			{/* The first link on the page, and the next stop when Tab leaves the game, so a
			    screen reader or keyboard reaches the Journal in one step. While playing it is
			    the corner button on phones; elsewhere it shows when focused. */}
			<Link
				href="/journal"
				aria-label="Journal: read it as a normal website"
				className={`z-20 border-2 border-[#e8f5e9]/70 bg-[#0b1320]/80 px-3 py-1.5 font-pixel text-xs uppercase tracking-wider text-[#e8f5e9] ${
					playing ? "absolute right-3 top-3 md:sr-only md:focus:not-sr-only" : "sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
				}`}
			>
				Journal
			</Link>

			<div
				className={`absolute inset-0 transition-opacity duration-700 ${playing ? "pointer-events-none opacity-0" : "opacity-100"}`}
				aria-hidden={playing}
				inert={playing}
				onClick={screen === "splash" ? () => setScreen("menu") : undefined}
			>
				{titleArt}
				<div className="absolute inset-x-0 top-[9vh] flex flex-col items-center px-4 text-center">
					<h1 className="title-logo font-pixel text-6xl uppercase tracking-[0.12em] text-[#fff4d6] sm:text-8xl">datagutt</h1>
					<p className="mt-4 border-2 border-[#1b2440] bg-[#b83a38] px-4 py-1 font-pixel text-base uppercase tracking-[0.3em] text-[#fff4d6] shadow-[3px_3px_0_#1b2440] sm:text-lg">
						Fjord Town
					</p>
				</div>

				<div className="absolute inset-x-0 bottom-[12vh] flex flex-col items-center px-4">
					{screen === "splash" && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setScreen("menu");
							}}
							className="title-blink font-pixel text-xl uppercase tracking-[0.25em] text-[#fff4d6] [text-shadow:2px_2px_0_#1b2440,-2px_-2px_0_#1b2440,2px_-2px_0_#1b2440,-2px_2px_0_#1b2440,4px_4px_0_#1b2440] sm:text-3xl"
						>
							Press start
						</button>
					)}

					{screen !== "splash" && (
						<div
							ref={menuRef}
							className="w-full max-w-sm border-2 border-[#fff4d6] bg-[#1b2440]/90 p-3 shadow-[4px_4px_0_#0b1320]"
						>
							{screen === "menu" && (
								<nav aria-label="Title menu">
									<ul className="flex flex-col">
										{hasSave && (
											<MenuItem disabled={!ready} onClick={() => enter(false)}>
												{ready ? "Continue" : loadingLabel}
											</MenuItem>
										)}
										<MenuItem disabled={!ready} onClick={() => (hasSave ? setScreen("confirm") : enter(false))}>
											{ready || hasSave ? "New game" : loadingLabel}
										</MenuItem>
										<MenuItem onClick={() => setScreen("credits")}>Credits</MenuItem>
										<MenuItem href="/journal">{JOURNAL_LABEL}</MenuItem>
									</ul>
								</nav>
							)}

							{screen === "confirm" && (
								<div role="alertdialog" aria-labelledby="title-confirm" className="flex flex-col gap-3">
									<p id="title-confirm" className="px-2 pt-1 font-pixel text-sm leading-relaxed text-[#fff4d6]">
										Start a new game? Your passport stamps and progress will be forgotten.
									</p>
									<ul className="flex flex-col">
										<MenuItem onClick={() => setScreen("menu")}>Keep my save</MenuItem>
										<MenuItem onClick={() => enter(true)}>Start over</MenuItem>
									</ul>
								</div>
							)}

							{screen === "credits" && (
								<div className="flex flex-col gap-2">
									<div className="max-h-[40vh] overflow-y-auto px-2 pt-1 text-center font-pixel text-xs leading-relaxed text-[#fff4d6]">
										<p className="text-sm text-[#7ee0a8]">{credits.title}</p>
										<p>{credits.byline}</p>
										{credits.sections.map((section) => (
											<div key={section.heading} className="mt-3">
												<p className="text-[#7ee0a8]">{section.heading}</p>
												{section.lines.map((line) => (
													<p key={line}>{line}</p>
												))}
											</div>
										))}
										<p className="mt-3 text-[#7ee0a8]">{credits.thanks}</p>
									</div>
									<ul className="flex flex-col">
										<MenuItem onClick={() => setScreen("menu")}>Back</MenuItem>
									</ul>
								</div>
							)}
						</div>
					)}

					{phase === "failed" && (
						<p className="mt-4 max-w-sm bg-[#1b2440]/90 p-3 font-sans text-sm text-[#fff4d6]">
							The game could not start in this browser. Everything is on the <Link href="/journal" className="underline">normal website</Link>.
						</p>
					)}
					<noscript>
						<p className="mt-4 max-w-sm bg-[#1b2440]/90 p-3 font-sans text-sm text-[#fff4d6]">
							The game needs JavaScript. Everything is on the <a href="/journal" className="underline">normal website</a>.
						</p>
					</noscript>
				</div>
			</div>
		</div>
	);
}

/**
 * One line of the menu, with a pixel cursor while it is hovered or focused. A disabled
 * line (still loading) stays focusable, so the cursor can wait on it until it works.
 */
function MenuItem({ children, onClick, href, disabled }: { children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean }) {
	const className =
		"group flex w-full items-center gap-2 px-2 py-2 text-left font-pixel text-base uppercase tracking-wider text-[#fff4d6] outline-none hover:bg-[#fff4d6]/10 focus-visible:bg-[#fff4d6]/10 aria-disabled:cursor-wait aria-disabled:opacity-60 sm:text-lg";
	const cursor = (
		<span aria-hidden="true" className="w-4 text-[#ffd166] opacity-0 group-hover:opacity-100 group-focus:opacity-100">
			▶
		</span>
	);
	return (
		<li>
			{href ? (
				<Link href={href} data-menu-item className={className}>
					{cursor}
					{children}
				</Link>
			) : (
				<button type="button" data-menu-item onClick={disabled ? undefined : onClick} aria-disabled={disabled || undefined} className={className}>
					{cursor}
					{children}
				</button>
			)}
		</li>
	);
}
