"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useDeferredInit } from "../hooks/useDeferredInit";
import { useNearViewport } from "../hooks/useNearViewport";
import { skillCategories } from "../data/skills";

gsap.registerPlugin(ScrollTrigger);

export default function TechStack() {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const ready = useDeferredInit();
	const nearViewport = useNearViewport(sectionRef);

	useEffect(() => {
		if (!ready || !nearViewport) return;

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

			const categories = gridRef.current?.children;
			if (categories && categories.length > 0) {
				gsap.from(categories, {
					y: 40,
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
	}, [ready, nearViewport]);

	return (
		<section ref={sectionRef} className="py-12 md:py-20 row">
			<div ref={headingRef} className="mb-8 md:mb-10">
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					Tech Stack
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					Tools I work with
				</p>
			</div>

			<div
				ref={gridRef}
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
			>
				{skillCategories.map((category) => (
					<div key={category.name}>
						<h3 className="font-pixel text-primary-500 text-sm uppercase tracking-wider mb-3">
							{category.name}
						</h3>
						<div className="flex flex-wrap gap-2">
							{category.skills.map((skill) => (
								<span
									key={skill}
									className="font-pixel text-xs px-3 py-1.5 rounded-full border border-primary-800/60 bg-primary-950/50 text-primary-400"
								>
									{skill}
								</span>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
