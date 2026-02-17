"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
import { projects } from "../data/projects";
import ProjectCard from "./ProjectCard";

gsap.registerPlugin(ScrollTrigger);

export default function Portfolio() {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		if (prefersReduced) return;

		const ctx = gsap.context(() => {
			// Heading entrance
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

			// Cards stagger entrance
			const cards = gridRef.current?.children;
			if (cards && cards.length > 0) {
				gsap.from(cards, {
					y: 60,
					opacity: 0,
					duration: 0.6,
					stagger: 0.15,
					ease: "power3.out",
					scrollTrigger: {
						trigger: gridRef.current,
						start: "top 70%",
						toggleActions: "play none none none",
					},
				});
			}
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section ref={sectionRef} className="py-20 px-6 md:px-12 lg:px-20">
			<div ref={headingRef} className="mb-10 md:mb-14">
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					Portfolio
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					Selected work
				</p>
			</div>

			<div
				ref={gridRef}
				className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
			>
				{projects.map((project, i) => (
					<ProjectCard
						key={project.id}
						name={project.name}
						description={project.description}
						image={project.image}
						link={project.link}
						poweredBy={project.poweredBy}
						index={i}
					/>
				))}
			</div>
		</section>
	);
}
