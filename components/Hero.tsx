"use client";

import { gsap } from "gsap";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import CanvasSwitcher from "./canvas/CanvasSwitcher";
import Socials from "./Socials";

export default function Hero() {
	const [burstActive, setBurstActive] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);
	const avatarRef = useRef<HTMLImageElement>(null);
	const greetingRef = useRef<HTMLDivElement>(null);
	const nameRef = useRef<HTMLDivElement>(null);
	const descRef = useRef<HTMLParagraphElement>(null);
	const socialsRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (prefersReduced) {
			gsap.set(
				[
					avatarRef.current,
					greetingRef.current,
					nameRef.current,
					descRef.current,
					socialsRef.current,
					scrollRef.current,
				],
				{ autoAlpha: 1 },
			);
			nameRef.current
				?.querySelector(".stack")
				?.classList.add("stack-glitch");
			return;
		}

		const stackDiv = nameRef.current?.querySelector(".stack");
		const spans = stackDiv?.querySelectorAll("span");
		const tl = gsap.timeline({ delay: 0.3 });

		tl.fromTo(
			avatarRef.current,
			{ autoAlpha: 0, scale: 0.6 },
			{ autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" },
		)
			.fromTo(
				greetingRef.current,
				{ autoAlpha: 0, y: 20 },
				{ autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" },
				"-=0.3",
			)
			.fromTo(
				spans ?? [],
				{
					autoAlpha: 0,
					x: () => (Math.random() > 0.5 ? -40 : 40),
				},
				{
					autoAlpha: 1,
					x: 0,
					duration: 0.35,
					stagger: 0.1,
					ease: "power4.out",
				},
			)
			.fromTo(
				nameRef.current,
				{ autoAlpha: 0 },
				{ autoAlpha: 1, duration: 0.01 },
				"<",
			)
			.fromTo(
				descRef.current,
				{ autoAlpha: 0, y: 15 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
				"-=0.1",
			)
			.fromTo(
				socialsRef.current,
				{ autoAlpha: 0, y: 10 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
				"-=0.1",
			)
			.fromTo(
				scrollRef.current,
				{ autoAlpha: 0 },
				{ autoAlpha: 1, duration: 0.6, ease: "power2.out" },
				"-=0.1",
			)
			.call(() => {
				stackDiv?.classList.add("stack-glitch");
			});

		const bounce = gsap.to(scrollRef.current, {
			y: 8,
			duration: 1.2,
			ease: "power1.inOut",
			repeat: -1,
			yoyo: true,
			delay: tl.duration() + 0.3,
		});

		return () => {
			tl.kill();
			bounce.kill();
		};
	}, []);

	const handleAvatarEnter = () => {
		setBurstActive(true);
		setTimeout(() => setBurstActive(false), 1000);
	};

	return (
		<section
			ref={sectionRef}
			className="w-screen h-screen flex items-end relative bg-black"
		>
			<div className="z-40 flex flex-col items-start px-8 md:px-16 lg:px-24 pb-28 md:pb-32 max-w-4xl">
				<div className="flex items-center gap-4 mb-4">
					<Image
						ref={avatarRef}
						src="/images/avatar.png"
						width={64}
						height={64}
						loading="eager"
						alt="Avatar"
						className="gsap-hero rounded-full cursor-pointer"
						style={{
							maxWidth: "100%",
							height: "auto",
						}}
						onMouseEnter={handleAvatarEnter}
					/>
					<div
						ref={greetingRef}
						className="gsap-hero font-pixel text-primary-600 text-sm md:text-base uppercase tracking-wider"
					>
						Thomas Lekanger
					</div>
				</div>
				<h1 ref={nameRef} className="gsap-hero leading-[0.9] mb-5">
					<div
						className="stack font-pixel-line text-[12vw] md:text-[8vw] transform-gpu"
						style={
							{
								"--stacks": 3,
							} as React.CSSProperties
						}
					>
						<span
							style={
								{
									"--index": 0,
								} as React.CSSProperties
							}
						>
							Full-stack
						</span>
						<span
							style={
								{
									"--index": 1,
								} as React.CSSProperties
							}
						>
							Full-stack
						</span>
						<span
							style={
								{
									"--index": 2,
								} as React.CSSProperties
							}
						>
							Full-stack
						</span>
					</div>
					<div className="text-[12vw] md:text-[8vw] font-pixel-grid text-primary-500/90 leading-[0.85]">
						developer
					</div>
				</h1>
				<p
					ref={descRef}
					className="gsap-hero font-light text-gray-400 text-base md:text-lg max-w-lg mb-6 leading-relaxed"
				>
					Building live streaming tools, payment solutions, and weird
					side projects from Norway.
				</p>
				<div ref={socialsRef} className="gsap-hero">
					<Socials />
				</div>
			</div>
			<CanvasSwitcher
				burstActive={burstActive}
				mouseContainerRef={sectionRef}
				className="absolute z-10 w-full h-full"
			/>
			<div className="absolute bottom-0 left-0 right-0 top-0 z-20 bg-gradient-to-b from-transparent pointer-events-none to-black via-transparent" />
			{/* Scroll indicator */}
			<div
				ref={scrollRef}
				className="gsap-hero absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 text-primary-500/80"
			>
				<span className="font-pixel text-xs uppercase tracking-widest">
					Scroll
				</span>
				<svg
					className="w-5 h-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</div>
		</section>
	);
}
