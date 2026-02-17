"use client";

import { gsap } from "gsap";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import PixelGrid from "./PixelGrid";
import Socials from "./Socials";

export default function Hero() {
	const [burstActive, setBurstActive] = useState(false);
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
			// Just reveal everything immediately
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
			nameRef.current?.classList.add("stack-glitch");
			return;
		}

		const spans = nameRef.current?.querySelectorAll("span");
		const tl = gsap.timeline({ delay: 0.3 });

		// Avatar
		tl.fromTo(
			avatarRef.current,
			{ autoAlpha: 0, scale: 0.6 },
			{ autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" },
		)
			// "Hello, I'm"
			.fromTo(
				greetingRef.current,
				{ autoAlpha: 0, y: 20 },
				{ autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" },
				"-=0.3",
			)
			// "Thomas" spans — staggered glitch entrance
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
			// Flash text-shadow on the name container for glitch feel
			.fromTo(
				nameRef.current,
				{ autoAlpha: 0 },
				{ autoAlpha: 1, duration: 0.01 },
				"<",
			)
			// Description
			.fromTo(
				descRef.current,
				{ autoAlpha: 0, y: 15 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
				"-=0.1",
			)
			// Socials
			.fromTo(
				socialsRef.current,
				{ autoAlpha: 0, y: 10 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
				"-=0.1",
			)
			// Scroll indicator
			.fromTo(
				scrollRef.current,
				{ autoAlpha: 0 },
				{ autoAlpha: 1, duration: 0.6, ease: "power2.out" },
				"-=0.1",
			)
			// Enable ongoing CSS glitch after entrance
			.call(() => {
				nameRef.current?.classList.add("stack-glitch");
			});

		// Scroll indicator bounce — starts after timeline
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
		<section className="w-screen h-screen flex items-center justify-center relative bg-black">
			<div className="z-40 flex flex-col items-center row">
				<Image
					ref={avatarRef}
					src="/images/avatar.png"
					width={150}
					height={150}
					loading="eager"
					alt="Avatar"
					className="gsap-hero rounded-full mb-[1.67vw] cursor-pointer"
					style={{
						maxWidth: "100%",
						height: "auto",
					}}
					onMouseEnter={handleAvatarEnter}
				/>
				<h1 className="leading-[0.9] flex flex-col mb-[1.11vw]">
					<div ref={greetingRef} className="gsap-hero text-[6vw]">
						Hello, I&apos;m
					</div>
					<div
						ref={nameRef}
						className="gsap-hero stack font-pixel-line text-[7vw] transform-gpu"
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
							Thomas
						</span>
						<span
							style={
								{
									"--index": 1,
								} as React.CSSProperties
							}
						>
							Thomas
						</span>
						<span
							style={
								{
									"--index": 2,
								} as React.CSSProperties
							}
						>
							Thomas
						</span>
					</div>
				</h1>
				<p
					ref={descRef}
					className="gsap-hero md:w-1/2 font-light text-center mb-[1.67vw]"
				>
					A full-stack web developer from Norway.
				</p>
				<div ref={socialsRef} className="gsap-hero">
					<Socials />
				</div>
			</div>
			<PixelGrid
				burstActive={burstActive}
				className="absolute z-10 w-full h-full"
			/>
			<div className="absolute bottom-0 left-0 right-0 top-0 z-20 bg-gradient-to-b from-transparent pointer-events-none to-black via-transparent"></div>
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
