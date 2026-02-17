"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useDeferredInit } from "../hooks/useDeferredInit";
import { experience } from "../data/experience";

gsap.registerPlugin(ScrollTrigger);

export default function Experience() {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const lineRef = useRef<HTMLDivElement>(null);
	const entriesRef = useRef<HTMLDivElement>(null);
	const ready = useDeferredInit();

	useEffect(() => {
		if (!ready) return;

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

			// Vertical line grows
			gsap.from(lineRef.current, {
				scaleY: 0,
				transformOrigin: "top",
				duration: 1,
				ease: "power2.out",
				scrollTrigger: {
					trigger: lineRef.current,
					start: "top 80%",
					toggleActions: "play none none none",
				},
			});

			// Entries slide in from left
			const entries = entriesRef.current?.children;
			if (entries && entries.length > 0) {
				gsap.from(entries, {
					x: -40,
					opacity: 0,
					duration: 0.6,
					stagger: 0.2,
					ease: "power3.out",
					scrollTrigger: {
						trigger: entriesRef.current,
						start: "top 75%",
						toggleActions: "play none none none",
					},
				});
			}
		}, sectionRef);

		return () => ctx.revert();
	}, [ready]);

	return (
		<section ref={sectionRef} className="py-12 md:py-20 row">
			<div ref={headingRef} className="mb-8 md:mb-10">
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					Experience
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					Where I&apos;ve worked
				</p>
			</div>

			<div className="relative">
				{/* Vertical timeline line */}
				<div
					ref={lineRef}
					className="absolute left-3 md:left-4 top-0 bottom-0 w-px bg-primary-800/50"
				/>

				<div ref={entriesRef} className="space-y-10">
					{experience.map((job) => (
						<div
							key={job.id}
							className="relative pl-10 md:pl-12"
						>
							{/* Timeline dot */}
							<div className="absolute left-1.5 md:left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-primary-500 bg-black" />

							<div>
								<p className="font-pixel text-primary-600 text-xs uppercase tracking-wider mb-1">
									{job.period}
								</p>
								<h3 className="font-pixel-line text-xl md:text-2xl mb-1">
									{job.role}
								</h3>
								<p className="text-gray-400 text-sm mb-3">
									{job.company}
								</p>
								<p className="font-light text-gray-300 text-sm leading-relaxed mb-3">
									{job.description}
								</p>
								<div className="flex flex-wrap gap-2">
									{job.tech.map((t) => (
										<span
											key={t}
											className="font-pixel text-xs px-2.5 py-1 rounded-full border border-primary-800/60 bg-primary-950/50 text-primary-400"
										>
											{t}
										</span>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
