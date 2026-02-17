"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const FACTS = [
	{ label: "Location", value: "Oslo, Norway" },
	{ label: "Role", value: "Full-stack Developer" },
	{ label: "Focus", value: "Streaming & Payments" },
	{ label: "Side projects", value: "Always shipping" },
];

export default function About() {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
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

			const children = contentRef.current?.children;
			if (children && children.length > 0) {
				gsap.from(children, {
					y: 40,
					opacity: 0,
					duration: 0.6,
					stagger: 0.15,
					ease: "power3.out",
					scrollTrigger: {
						trigger: contentRef.current,
						start: "top 75%",
						toggleActions: "play none none none",
					},
				});
			}
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section ref={sectionRef} className="py-12 md:py-20 row">
			<div ref={headingRef} className="mb-8 md:mb-10">
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					About
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					A bit about me
				</p>
			</div>

			<div
				ref={contentRef}
				className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"
			>
				<div className="space-y-4">
					<p className="font-light text-gray-300 leading-relaxed">
						I&apos;m Thomas, a full-stack developer based in Norway.
						I enjoy building things for the web &mdash; from live
						streaming infrastructure and payment integrations to
						weird side projects that keep me up at night.
					</p>
					<p className="font-light text-gray-400 leading-relaxed">
						Most of my work revolves around TypeScript, React, and
						Node.js, but I also dabble in Rust when performance
						matters. I care about shipping fast, writing clean code,
						and making products that people actually want to use.
					</p>
				</div>

				<div className="rounded-xl border border-primary-900/40 bg-gradient-to-br from-black to-primary-950/30 p-6">
					<h3 className="font-pixel text-primary-500 text-sm uppercase tracking-wider mb-4">
						Quick facts
					</h3>
					<dl className="space-y-3">
						{FACTS.map((fact) => (
							<div key={fact.label} className="flex justify-between items-baseline">
								<dt className="text-gray-500 text-sm">
									{fact.label}
								</dt>
								<dd className="font-light text-gray-200 text-sm">
									{fact.value}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>
		</section>
	);
}
