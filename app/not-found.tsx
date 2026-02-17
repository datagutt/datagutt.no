"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import { setupCanvas } from "./utils/canvas";
import { useResizeKey } from "../hooks/useResizeKey";

const CELL = 14;
const GAP = 2;
const STEP = CELL + GAP;

const PALETTE = [
	{ r: 4, g: 47, b: 28, weight: 0.45 },
	{ r: 18, g: 85, b: 54, weight: 0.25 },
	{ r: 18, g: 131, b: 75, weight: 0.15 },
	{ r: 29, g: 198, b: 114, weight: 0.1 },
	{ r: 70, g: 226, b: 148, weight: 0.05 },
];

const CORRUPT_PALETTE = [
	{ r: 255, g: 60, b: 60 },
	{ r: 255, g: 60, b: 200 },
	{ r: 60, g: 200, b: 255 },
	{ r: 255, g: 255, b: 255 },
];

function pickPalette() {
	const roll = Math.random();
	let cum = 0;
	for (const p of PALETTE) {
		cum += p.weight;
		if (roll <= cum) return p;
	}
	return PALETTE[0];
}

type CorruptionZone = {
	x: number;
	y: number;
	w: number;
	h: number;
	age: number;
	isStatic: boolean;
};

export default function NotFound() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef(0);
	const resizeKey = useResizeKey(canvasRef);

	const headingRef = useRef<HTMLDivElement>(null);
	const subtitleRef = useRef<HTMLDivElement>(null);
	const dividerRef = useRef<HTMLDivElement>(null);
	const messageRef = useRef<HTMLParagraphElement>(null);
	const buttonRef = useRef<HTMLDivElement>(null);

	// GSAP entrance animation
	useEffect(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		const elements = [
			headingRef.current,
			subtitleRef.current,
			dividerRef.current,
			messageRef.current,
			buttonRef.current,
		];

		if (prefersReduced) {
			gsap.set(elements, { autoAlpha: 1 });
			headingRef.current
				?.querySelector(".stack")
				?.classList.add("stack-glitch-fast");
			return;
		}

		const stackDiv = headingRef.current?.querySelector(".stack");
		const spans = stackDiv?.querySelectorAll("span");
		const tl = gsap.timeline({ delay: 0.2 });

		tl.fromTo(
			spans ?? [],
			{
				autoAlpha: 0,
				x: () => (Math.random() > 0.5 ? -60 : 60),
			},
			{
				autoAlpha: 1,
				x: 0,
				duration: 0.4,
				stagger: 0.08,
				ease: "power4.out",
			},
		)
			.fromTo(
				headingRef.current,
				{ autoAlpha: 0 },
				{ autoAlpha: 1, duration: 0.01 },
				"<",
			)
			.call(() => {
				stackDiv?.classList.add("stack-glitch-fast");
			})
			.fromTo(
				subtitleRef.current,
				{ autoAlpha: 0, y: 15 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" },
				"-=0.1",
			)
			.fromTo(
				dividerRef.current,
				{ autoAlpha: 0, scaleX: 0 },
				{ autoAlpha: 1, scaleX: 1, duration: 0.3, ease: "power2.out" },
				"-=0.1",
			)
			.fromTo(
				messageRef.current,
				{ autoAlpha: 0, y: 10 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
				"-=0.1",
			)
			.fromTo(
				buttonRef.current,
				{ autoAlpha: 0, y: 10 },
				{ autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
				"-=0.1",
			);

		return () => {
			tl.kill();
		};
	}, []);

	// Canvas animation
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = setupCanvas(canvas);
		const rect = canvas.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;
		const cols = Math.ceil(w / STEP);
		const rows = Math.ceil(h / STEP);

		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		// Init grid
		const grid: { r: number; g: number; b: number }[][] = [];
		for (let row = 0; row < rows; row++) {
			grid[row] = [];
			for (let col = 0; col < cols; col++) {
				const p = pickPalette();
				grid[row][col] = { r: p.r, g: p.g, b: p.b };
			}
		}

		// Corruption state
		const corrupted: boolean[][] = [];
		for (let row = 0; row < rows; row++) {
			corrupted[row] = [];
			for (let col = 0; col < cols; col++) {
				corrupted[row][col] = false;
			}
		}

		const zones: CorruptionZone[] = [];

		// Corruption spread progress: 0 to 1
		let corruptionLevel = 0;
		const CORRUPTION_GROWTH_DURATION = 30 * 60; // 30 seconds at 60fps
		const MAX_CORRUPTION = 0.4;

		// Scanline offsets per row
		const scanlineOffsets: number[] = new Array(rows).fill(0);

		// Mouse
		const mouse = { x: -1000, y: -1000 };
		const onMove = (e: MouseEvent) => {
			const r = canvas.getBoundingClientRect();
			mouse.x = e.clientX - r.left;
			mouse.y = e.clientY - r.top;
		};
		const onLeave = () => {
			mouse.x = -1000;
			mouse.y = -1000;
		};
		canvas.addEventListener("mousemove", onMove);
		canvas.addEventListener("mouseleave", onLeave);

		// Spawn a corruption zone
		const spawnZone = (isStatic: boolean) => {
			const zw = 3 + Math.floor(Math.random() * 8);
			const zh = 2 + Math.floor(Math.random() * 6);
			const zx = Math.floor(Math.random() * (cols - zw));
			const zy = Math.floor(Math.random() * (rows - zh));
			zones.push({ x: zx, y: zy, w: zw, h: zh, age: 0, isStatic });

			// Mark cells in zone as corrupted
			for (let r = zy; r < zy + zh && r < rows; r++) {
				for (let c = zx; c < zx + zw && c < cols; c++) {
					corrupted[r][c] = true;
				}
			}
		};

		// Seed initial corruption (~10%)
		const initialZones = Math.max(3, Math.floor((cols * rows * 0.1) / 25));
		for (let i = 0; i < initialZones; i++) {
			spawnZone(Math.random() < 0.2);
		}

		let frameCount = 0;

		// Draw static frame for reduced motion
		if (prefersReduced) {
			ctx.clearRect(0, 0, w, h);
			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					const cell = grid[row][col];
					const x = col * STEP;
					const y = row * STEP;
					const alpha = corrupted[row][col] ? 0.15 : 0.03;
					if (corrupted[row][col]) {
						const cp =
							CORRUPT_PALETTE[
								Math.floor(Math.random() * CORRUPT_PALETTE.length)
							];
						ctx.fillStyle = `rgba(${cp.r},${cp.g},${cp.b},${alpha})`;
					} else {
						ctx.fillStyle = `rgba(${cell.r},${cell.g},${cell.b},${alpha})`;
					}
					ctx.fillRect(x, y, CELL, CELL);
				}
			}
			return;
		}

		const draw = () => {
			const mCol = Math.floor(mouse.x / STEP);
			const mRow = Math.floor(mouse.y / STEP);

			// Update corruption level
			if (frameCount < CORRUPTION_GROWTH_DURATION) {
				corruptionLevel = Math.min(
					MAX_CORRUPTION,
					(frameCount / CORRUPTION_GROWTH_DURATION) * MAX_CORRUPTION,
				);
			}

			// Spawn new corruption zones periodically
			if (
				frameCount % 120 === 0 &&
				frameCount > 0 &&
				corruptionLevel < MAX_CORRUPTION
			) {
				spawnZone(Math.random() < 0.15);
			}

			// Update scanline offsets for corrupted rows
			if (frameCount % 8 === 0) {
				for (let r = 0; r < rows; r++) {
					// Check if any cell in this row is corrupted
					let rowCorrupted = false;
					for (let c = 0; c < cols; c++) {
						if (corrupted[r][c]) {
							rowCorrupted = true;
							break;
						}
					}
					if (rowCorrupted && Math.random() < 0.3) {
						scanlineOffsets[r] = Math.floor(Math.random() * 7) - 3;
					} else {
						scanlineOffsets[r] = 0;
					}
				}
			}

			// Draw
			ctx.clearRect(0, 0, w, h);

			for (let row = 0; row < rows; row++) {
				const rowShift = scanlineOffsets[row] * STEP;

				for (let col = 0; col < cols; col++) {
					const cell = grid[row][col];
					const baseX = col * STEP + rowShift;
					const y = row * STEP;

					// Skip cells shifted off screen
					if (baseX < -CELL || baseX > w) continue;

					const isCorrupted = corrupted[row]?.[col] ?? false;

					// Check mouse repair proximity
					const cellDist = Math.abs(col - mCol) + Math.abs(row - mRow);
					const nearMouse = cellDist <= 5;

					let alpha: number;
					let cr: number;
					let cg: number;
					let cb: number;

					if (nearMouse) {
						// Mouse "repairs" cells — show bright green
						cr = cell.r;
						cg = cell.g;
						cb = cell.b;
						if (cellDist <= 2) alpha = 0.5;
						else if (cellDist <= 4) alpha = 0.3;
						else alpha = 0.15;
					} else if (isCorrupted) {
						// Find which zone this cell belongs to for static check
						let isStaticZone = false;
						for (const zone of zones) {
							if (
								zone.isStatic &&
								col >= zone.x &&
								col < zone.x + zone.w &&
								row >= zone.y &&
								row < zone.y + zone.h
							) {
								isStaticZone = true;
								break;
							}
						}

						if (isStaticZone) {
							// TV static: random gray pixels
							const gray = Math.floor(Math.random() * 200);
							cr = gray;
							cg = gray;
							cb = gray;
							alpha = 0.15 + Math.random() * 0.25;
						} else {
							// Corrupt color + flicker
							const cp =
								CORRUPT_PALETTE[
									Math.floor(Math.random() * CORRUPT_PALETTE.length)
								];
							cr = cp.r;
							cg = cp.g;
							cb = cp.b;
							// Flicker: rapidly toggle alpha
							alpha = Math.random() < 0.3 ? 0.05 : 0.15 + Math.random() * 0.3;
						}
					} else {
						// Normal green cell
						cr = cell.r;
						cg = cell.g;
						cb = cell.b;
						alpha = 0.03;
					}

					if (alpha < 0.02) continue;

					// 3D cell rendering for bright cells
					if (alpha > 0.3) {
						ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
						ctx.fillRect(baseX, y, CELL, CELL);
						ctx.fillStyle = `rgba(255,255,255,${alpha * 0.08})`;
						ctx.fillRect(baseX, y, CELL, 1);
						ctx.fillRect(baseX, y, 1, CELL);
						ctx.fillStyle = `rgba(0,0,0,${alpha * 0.15})`;
						ctx.fillRect(baseX + CELL - 1, y, 1, CELL);
						ctx.fillRect(baseX, y + CELL - 1, CELL, 1);
					} else {
						ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
						ctx.fillRect(baseX, y, CELL, CELL);
					}
				}
			}

			// CRT scanline overlay
			ctx.fillStyle = "rgba(0,0,0,0.03)";
			for (let y = 0; y < h; y += 3) {
				ctx.fillRect(0, y, w, 1);
			}

			frameCount++;
			animRef.current = requestAnimationFrame(draw);
		};

		animRef.current = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(animRef.current);
			canvas.removeEventListener("mousemove", onMove);
			canvas.removeEventListener("mouseleave", onLeave);
		};
	}, [resizeKey]);

	return (
		<div className="relative w-screen h-screen bg-black overflow-hidden">
			{/* Corrupted pixel canvas */}
			<canvas
				ref={canvasRef}
				className="absolute inset-0 z-10"
				style={{ width: "100%", height: "100%" }}
			/>

			{/* Gradient overlay */}
			<div className="absolute inset-0 z-20 bg-black/40 pointer-events-none" />

			{/* UI overlay */}
			<div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
				{/* 404 heading */}
				<div ref={headingRef} className="gsap-hero">
					<div
						className="stack stack-glitch-fast font-pixel-grid text-[20vw] leading-none text-primary-500 transform-gpu"
						style={{ "--stacks": 3 } as React.CSSProperties}
					>
						<span style={{ "--index": 0 } as React.CSSProperties}>404</span>
						<span style={{ "--index": 1 } as React.CSSProperties}>404</span>
						<span style={{ "--index": 2 } as React.CSSProperties}>404</span>
					</div>
				</div>

				{/* Subtitle */}
				<div
					ref={subtitleRef}
					className="gsap-hero font-pixel text-primary-500 text-sm md:text-base uppercase tracking-[0.3em] mt-4"
				>
					Level Not Found
				</div>

				{/* Pixel divider */}
				<div
					ref={dividerRef}
					className="gsap-hero pixel-divider w-48 md:w-64 my-6 origin-center"
				/>

				{/* Error message */}
				<p
					ref={messageRef}
					className="gsap-hero text-gray-500 text-sm md:text-base text-center max-w-md px-4"
				>
					The page you&apos;re looking for doesn&apos;t exist or has been
					corrupted.
				</p>

				{/* Return link */}
				<div ref={buttonRef} className="gsap-hero mt-8 pointer-events-auto">
					<Link
						href="/"
						className="font-pixel text-[11px] uppercase tracking-wider px-5 py-2.5 border border-primary-600/50 text-primary-400 rounded transition-all duration-200 hover:bg-primary-800/40 hover:text-primary-300 hover:border-primary-500/60"
					>
						Return to Base
					</Link>
				</div>
			</div>
		</div>
	);
}
