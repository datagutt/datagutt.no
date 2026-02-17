"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { gsap } from "gsap";

const FONT_VARIANTS = [
	"font-pixel-triangle",
	"font-pixel-grid",
	"font-pixel-circle",
	"font-pixel-line",
	"font-pixel",
] as const;

type TechTag = {
	name: string;
};

type ProjectCardProps = {
	name: string;
	description?: string;
	image: string;
	link?: string;
	poweredBy?: TechTag[];
	index: number;
};

export default function ProjectCard({
	name,
	description,
	image,
	link,
	poweredBy,
	index,
}: ProjectCardProps) {
	const [expanded, setExpanded] = useState(false);
	const detailsRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);

	const fontClass = FONT_VARIANTS[index % FONT_VARIANTS.length];

	const handleToggle = useCallback(() => {
		const el = detailsRef.current;
		if (!el) return;

		if (!expanded) {
			setExpanded(true);
			gsap.set(el, { height: "auto" });
			const autoHeight = el.offsetHeight;
			gsap.fromTo(
				el,
				{ height: 0 },
				{ height: autoHeight, duration: 0.4, ease: "power2.out" }
			);
		} else {
			gsap.to(el, {
				height: 0,
				duration: 0.3,
				ease: "power2.in",
				onComplete: () => setExpanded(false),
			});
		}
	}, [expanded]);

	const handleMouseEnter = useCallback(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		if (prefersReduced) return;
		gsap.to(cardRef.current, { y: -4, duration: 0.25, ease: "power2.out" });
	}, []);

	const handleMouseLeave = useCallback(() => {
		gsap.to(cardRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
	}, []);

	return (
		<div
			ref={cardRef}
			className="rounded-xl border border-primary-900/40 bg-gradient-to-br from-black to-primary-950/30 overflow-hidden transition-colors duration-300 hover:border-primary-700/60"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{/* Image */}
			<div className="relative aspect-video w-full overflow-hidden bg-primary-950/20 flex items-center justify-center">
				<Image
					src={image}
					alt={name}
					fill
					sizes="(max-width: 768px) 100vw, 50vw"
					className="object-contain p-8"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
			</div>

			{/* Content */}
			<div className="p-5">
				<h3 className={`${fontClass} text-2xl md:text-3xl mb-2`}>
					{link ? (
						<Link
							href={link}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-primary-400 transition-colors duration-200"
						>
							{name}
						</Link>
					) : (
						name
					)}
				</h3>
				{description && (
					<p className="font-light text-sm text-gray-300 leading-relaxed mb-3">
						{description}
					</p>
				)}

				{/* Show more toggle */}
				{(poweredBy?.length || link) && (
					<button
						onClick={handleToggle}
						className="text-primary-500 text-sm font-pixel hover:text-primary-400 transition-colors duration-200"
					>
						{expanded ? "Show less" : "Show more"}
					</button>
				)}

				{/* Expandable details */}
				<div ref={detailsRef} className="project-details">
					<div className="pt-4 space-y-4">
						{/* Tech tags */}
						{poweredBy && poweredBy.length > 0 && (
							<div>
								<p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-pixel">
									Powered by
								</p>
								<div className="flex flex-wrap gap-2">
									{poweredBy.map((tech) => (
										<span
											key={tech.name}
											className="font-pixel text-xs px-3 py-1 rounded-full border border-primary-800/60 bg-primary-950/50 text-primary-400"
										>
											{tech.name}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Visit link */}
						{link && (
							<Link
								href={link}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 font-pixel text-sm px-4 py-2 rounded-lg border border-primary-700/50 bg-primary-950/40 text-primary-400 hover:bg-primary-900/40 hover:text-primary-300 transition-colors duration-200"
							>
								Visit project
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
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</Link>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
