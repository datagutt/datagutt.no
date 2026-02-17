"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
import { ActivityCalendar, type ThemeInput } from "react-activity-calendar";
import type { GitHubStats, ContributionDay } from "../lib/github";

gsap.registerPlugin(ScrollTrigger);

type StatsProps = {
	stats: GitHubStats;
	contributions: ContributionDay[];
};

const STAT_CONFIG = [
	{ key: "public_repos" as const, label: "Repositories" },
	{ key: "total_stars" as const, label: "Stars" },
	{ key: "years_coding" as const, label: "Years Coding" },
	{ key: "followers" as const, label: "Followers" },
];

const calendarTheme: ThemeInput = {
	dark: ["#161b22", "#042f1c", "#125536", "#12834b", "#1dc672"],
};

export default function Stats({ stats, contributions }: StatsProps) {
	const sectionRef = useRef<HTMLElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const cardsRef = useRef<HTMLDivElement>(null);
	const calendarRef = useRef<HTMLDivElement>(null);
	const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (prefersReduced) {
			STAT_CONFIG.forEach((s, i) => {
				const el = numberRefs.current[i];
				if (el) el.textContent = String(stats[s.key]);
			});
			return;
		}

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

			const cards = cardsRef.current?.children;
			if (cards && cards.length > 0) {
				gsap.from(cards, {
					y: 40,
					opacity: 0,
					duration: 0.5,
					stagger: 0.1,
					ease: "power3.out",
					scrollTrigger: {
						trigger: cardsRef.current,
						start: "top 80%",
						toggleActions: "play none none none",
					},
				});
			}

			if (calendarRef.current) {
				gsap.from(calendarRef.current, {
					y: 30,
					opacity: 0,
					duration: 0.6,
					ease: "power3.out",
					scrollTrigger: {
						trigger: calendarRef.current,
						start: "top 85%",
						toggleActions: "play none none none",
					},
				});
			}

			STAT_CONFIG.forEach((s, i) => {
				const el = numberRefs.current[i];
				if (!el) return;
				const target = stats[s.key];
				const obj = { val: 0 };
				gsap.to(obj, {
					val: target,
					duration: 1.5,
					ease: "power2.out",
					scrollTrigger: {
						trigger: el,
						start: "top 85%",
						toggleActions: "play none none none",
					},
					onUpdate: () => {
						el.textContent = String(Math.round(obj.val));
					},
				});
			});
		}, sectionRef);

		return () => ctx.revert();
	}, [stats]);

	return (
		<section ref={sectionRef} className="py-12 md:py-20 row">
			<div ref={headingRef} className="mb-8 md:mb-10">
				<h2 className="font-pixel-line text-4xl md:text-5xl lg:text-6xl mb-2">
					Stats
				</h2>
				<p className="font-pixel text-primary-700 text-sm md:text-base uppercase tracking-wider">
					GitHub at a glance
				</p>
			</div>

			<div
				ref={cardsRef}
				className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8"
			>
				{STAT_CONFIG.map((s, i) => (
					<div
						key={s.key}
						className="rounded-xl border border-primary-900/40 bg-gradient-to-br from-black to-primary-950/30 p-5 text-center"
					>
						<span
							ref={(el) => {
								numberRefs.current[i] = el;
							}}
							className="block font-pixel-line text-3xl md:text-4xl text-primary-400 mb-1"
						>
							0
						</span>
						<span className="font-pixel text-xs text-gray-500 uppercase tracking-wider">
							{s.label}
						</span>
					</div>
				))}
			</div>

			{contributions.length > 0 && (
				<div
					ref={calendarRef}
					className="w-full"
				>
					<ActivityCalendar
						data={contributions}
						theme={calendarTheme}
						colorScheme="dark"
						maxLevel={4}
						showColorLegend={false}
						tooltips={{
							activity: {
								text: (activity) =>
									`${activity.count} contribution${activity.count !== 1 ? "s" : ""} on ${activity.date}`,
							},
						}}
					/>
				</div>
			)}
		</section>
	);
}
