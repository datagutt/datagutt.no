"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useDeferredInit } from "../hooks/useDeferredInit";
import Socials from "./Socials";

gsap.registerPlugin(ScrollTrigger);

export default function Contact() {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
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

			const children = contentRef.current?.children;
			if (children && children.length > 0) {
				gsap.from(children, {
					y: 30,
					opacity: 0,
					duration: 0.5,
					stagger: 0.12,
					ease: "power3.out",
					scrollTrigger: {
						trigger: contentRef.current,
						start: "top 80%",
						toggleActions: "play none none none",
					},
				});
			}
		}, sectionRef);

		return () => ctx.revert();
	}, [ready]);

	return (
		<section ref={sectionRef} className="py-12 md:py-20 row">
			<div
				ref={headingRef}
				className="mb-8 md:mb-10 text-center"
			>
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					Get in Touch
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					Let&apos;s talk
				</p>
			</div>

			<div
				ref={contentRef}
				className="flex flex-col items-center text-center"
			>
				<p className="font-light text-gray-400 text-base md:text-lg max-w-md mb-6 leading-relaxed">
					Got a project in mind, want to collaborate, or just want to
					say hi? My inbox is always open.
				</p>

				<a
					href="mailto:mail@datagutt.no"
					className="inline-flex items-center gap-2 font-pixel text-sm px-6 py-3 rounded-lg border border-primary-700/50 bg-primary-950/40 text-primary-400 hover:bg-primary-900/40 hover:text-primary-300 transition-colors duration-200 mb-6"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
					mail@datagutt.no
				</a>

				<Socials />
			</div>
		</section>
	);
}
