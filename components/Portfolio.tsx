"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { projects } from "../data/projects";

export default function Portfolio() {
	const containerRef = useRef(null);
	const showcaseRef = useRef(null);
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		if (window.innerWidth < 768) {
			setIsMobile(true);
		} else {
			setIsMobile(false);
		}
	}, []);

	gsap.registerPlugin(ScrollTrigger);

	useEffect(() => {
		const ctx = gsap.context((self) => {
			gsap.set(showcaseRef.current, {
				xPercent: 50,
			});

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: containerRef.current,
					start: isMobile ? "top center" : "top bottom",
					end: "bottom top",
					scrub: 0.5,
				},
			});
			tl.to(
				showcaseRef.current,
				{
					xPercent: -50,
				},
				"<",
			);
		}, containerRef);

		return () => ctx.revert();
	}, [isMobile]);

	return (
        <section ref={containerRef} className="mb-[120vw] md:mb-[40vw]">
            <div
				ref={showcaseRef}
				className="relative mb-[5vw] z-40 md:w-[125.6vw] md:h-[34.6vw] h-[100vw]"
			>
				<div className="grid md:flex w-full h-full gap-4 md:gap-8 grid-cols-2 md:grid-cols-none">
					{projects.map((project) => (
						<Link
							key={project.id}
							href={project.link ?? "#"}
							target="_blank"
							passHref
							className="relative w-full h-full"
						>
							<div className="relative w-full h-full md:h-[50vw] lg:h-[17.3vw]">
								<Image
                                    src={project.image}
                                    alt={project.name}
                                    className="rounded-lg h-full w-full"
                                    fill
                                    sizes="100vw"
                                    style={{
                                        objectFit: "contain"
                                    }} />
							</div>
							<div className="absolute bottom-0 left-0 w-full md:h-1/2 bg-black bg-opacity-50 md:p-4">
								<h2 className="text-white text-3xl md:text-4xl font-pixel-triangle mb-2">
									{project.name}
								</h2>
								<p className="text-white text-sm md:text-base font-light hidden md:block">
									{project.description}
								</p>
							</div>
						</Link>
					))}
				</div>
			</div>
        </section>
    );
}
