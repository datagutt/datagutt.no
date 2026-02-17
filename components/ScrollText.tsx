"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollText() {
	const containerRef = useRef(null);
	const firstLineRef = useRef(null);
	const secondLineRef = useRef(null);

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;

		const ctx = gsap.context(() => {
			if (!prefersReduced) {
				gsap.fromTo(containerRef.current, {
					opacity: 0,
				}, {
					opacity: 1,
					duration: 0.8,
					ease: "power2.out",
					scrollTrigger: {
						trigger: containerRef.current,
						start: "top 85%",
						toggleActions: "play none none none",
					},
				});
			} else {
				gsap.set(containerRef.current, { opacity: 1 });
			}

			gsap.set(firstLineRef.current, {
				xPercent: 50,
			});

			gsap.set(secondLineRef.current, {
				xPercent: -50,
			});

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: containerRef.current,
					start: "top bottom",
					end: "bottom top",
					scrub: 0.5,
				},
			});

			tl.to(firstLineRef.current, {
				xPercent: -20,
			});
			tl.to(
				secondLineRef.current,
				{
					xPercent: 20,
				},
				"<",
			);
		}, containerRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={containerRef}
			className="relative py-16 md:py-24 overflow-hidden opacity-0"
			id="scroll-text"
		>
			<div className="w-[150vw] -ml-[25vw] text-[8vw] md:text-[6vw] leading-[0.9] uppercase text-primary-700">
				<div
					ref={firstLineRef}
					className="font-pixel-grid"
					style={{ willChange: "transform", transform: "translateX(50%)" }}
				>
					CHECK OUT MY PORTFOLIO
				</div>
				<div
					ref={secondLineRef}
					className="font-pixel-triangle"
					style={{ willChange: "transform", transform: "translateX(-50%)" }}
				>
					CHECK OUT MY PORTFOLIO
				</div>
			</div>
		</section>
	);
}
