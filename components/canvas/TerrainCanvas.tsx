"use client";

import { mkSimplexNoise } from "@spissvinkel/simplex-noise";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { setupCanvas } from "../../app/utils/canvas";

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;

// Elevation bands — dark depths to bright peaks
const BANDS: [number, string][] = [
	[-1.0, "rgba(4,47,28,0.10)"], // deep
	[-0.4, "rgba(18,85,54,0.18)"], // low
	[-0.1, "rgba(18,131,75,0.25)"], // mid
	[0.2, "rgba(29,198,114,0.35)"], // high
	[0.5, "rgba(70,226,148,0.45)"], // peak
	[0.8, "rgba(131,242,186,0.55)"], // snow
];

function bandColor(n: number): string {
	for (let i = BANDS.length - 1; i >= 0; i--) {
		if (n >= BANDS[i][0]) return BANDS[i][1];
	}
	return BANDS[0][1];
}

type Props = {
	mouseContainerRef?: React.RefObject<HTMLElement | null>;
	className?: string;
};

export default function TerrainCanvas({ mouseContainerRef, className }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef(0);
	const offsetRef = useRef({ x: 0, y: 0 });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = setupCanvas(canvas);
		const rect = canvas.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;
		const cols = Math.ceil(w / STEP);
		const rows = Math.ceil(h / STEP);
		const noise = mkSimplexNoise(Math.random);
		const scale = 0.04;

		// Slow drift
		const drift = { t: 0 };
		const driftTl = gsap.to(drift, {
			t: 1000,
			duration: 1000,
			ease: "none",
			repeat: -1,
		});

		// Mouse influence
		const mouse = { x: -1000, y: -1000 };
		const target = mouseContainerRef?.current ?? canvas;
		const onMove = (e: MouseEvent) => {
			const r = canvas.getBoundingClientRect();
			mouse.x = e.clientX - r.left;
			mouse.y = e.clientY - r.top;
		};
		const onLeave = () => {
			mouse.x = -1000;
			mouse.y = -1000;
		};
		target.addEventListener("mousemove", onMove);
		target.addEventListener("mouseleave", onLeave);

		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		const draw = () => {
			ctx.clearRect(0, 0, w, h);
			const ox = prefersReduced ? 0 : drift.t * 0.3;
			const oy = prefersReduced ? 0 : drift.t * 0.15;

			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					const nx = (col + ox) * scale;
					const ny = (row + oy) * scale;
					let n = noise.noise2D(nx, ny);

					// Mouse raises terrain nearby
					const cx = col * STEP + CELL / 2;
					const cy = row * STEP + CELL / 2;
					const dx = mouse.x - cx;
					const dy = mouse.y - cy;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist < 150) {
						n += (1 - dist / 150) * 0.5;
					}

					ctx.fillStyle = bandColor(n);
					ctx.fillRect(col * STEP, row * STEP, CELL, CELL);
				}
			}

			animRef.current = requestAnimationFrame(draw);
		};

		animRef.current = requestAnimationFrame(draw);

		const onResize = () => {
			setupCanvas(canvas);
		};
		window.addEventListener("resize", onResize);

		return () => {
			cancelAnimationFrame(animRef.current);
			driftTl.kill();
			target.removeEventListener("mousemove", onMove);
			target.removeEventListener("mouseleave", onLeave);
			window.removeEventListener("resize", onResize);
		};
	}, [mouseContainerRef]);

	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{ width: "100%", height: "100%" }}
		/>
	);
}
