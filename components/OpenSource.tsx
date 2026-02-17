"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useNearViewport } from "../hooks/useNearViewport";
import type { PinnedRepo } from "../lib/github";

gsap.registerPlugin(ScrollTrigger);

type OpenSourceProps = {
	repos: PinnedRepo[];
};

export default function OpenSource({ repos }: OpenSourceProps) {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const nearViewport = useNearViewport(sectionRef);

	useEffect(() => {
		if (!nearViewport) return;

		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (prefersReduced) return;

		const ctx = gsap.context(() => {
			gsap.from(headingRef.current, {
				y: 30,
				opacity: 0,
				duration: 0.6,
				ease: "power3.out",
				scrollTrigger: {
					trigger: headingRef.current,
					start: "top 80%",
					toggleActions: "play none none none",
				},
			});

			const cards = gridRef.current?.children;
			if (cards && cards.length > 0) {
				gsap.from(cards, {
					y: 50,
					opacity: 0,
					duration: 0.5,
					stagger: 0.1,
					ease: "power3.out",
					scrollTrigger: {
						trigger: gridRef.current,
						start: "top 75%",
						toggleActions: "play none none none",
					},
				});
			}
		}, sectionRef);

		return () => ctx.revert();
	}, [nearViewport]);

	if (repos.length === 0) return null;

	return (
		<section ref={sectionRef} className="py-12 md:py-20 row">
			<div ref={headingRef} className="mb-8 md:mb-10">
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					Open Source
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					Pinned repositories
				</p>
			</div>

			<div
				ref={gridRef}
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
			>
				{repos.map((repo) => (
					<a
						key={repo.name}
						href={`https://github.com/${repo.author}/${repo.name}`}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-xl border border-primary-900/40 bg-gradient-to-br from-black to-primary-950/30 p-5 hover:border-primary-700/60 transition-colors duration-300 flex flex-col"
					>
						<h3 className="font-pixel text-sm text-primary-400 mb-2 truncate">
							{repo.name}
						</h3>
						{repo.description && (
							<p className="font-light text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
								{repo.description}
							</p>
						)}
						<div className="flex items-center gap-4 text-xs text-gray-500 mt-auto">
							{repo.language && (
								<span className="flex items-center gap-1">
									<span
										className="w-2.5 h-2.5 rounded-full"
										style={{
											backgroundColor:
												repo.languageColor || undefined,
										}}
									/>
									{repo.language}
								</span>
							)}
							<span className="flex items-center gap-1">
								<svg
									className="w-3.5 h-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
									/>
								</svg>
								{repo.stars}
							</span>
							<span className="flex items-center gap-1">
								<svg
									className="w-3.5 h-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
									/>
								</svg>
								{repo.forks}
							</span>
						</div>
					</a>
				))}
			</div>
		</section>
	);
}
