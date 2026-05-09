"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Pixel = [number, number, string];

const HEART: Pixel[] = [
	[1, 1, "#ff6b8b"],
	[2, 1, "#ff6b8b"],
	[5, 1, "#ff6b8b"],
	[6, 1, "#ff6b8b"],
	[0, 2, "#ff3860"],
	[1, 2, "#ff6b8b"],
	[2, 2, "#ff6b8b"],
	[3, 2, "#ff6b8b"],
	[4, 2, "#ff6b8b"],
	[5, 2, "#ff6b8b"],
	[6, 2, "#ff6b8b"],
	[7, 2, "#ff3860"],
	[0, 3, "#ff3860"],
	[1, 3, "#ff6b8b"],
	[2, 3, "#ff6b8b"],
	[3, 3, "#ff6b8b"],
	[4, 3, "#ff6b8b"],
	[5, 3, "#ff6b8b"],
	[6, 3, "#ff6b8b"],
	[7, 3, "#ff3860"],
	[1, 4, "#ff3860"],
	[2, 4, "#ff6b8b"],
	[3, 4, "#ff6b8b"],
	[4, 4, "#ff6b8b"],
	[5, 4, "#ff6b8b"],
	[6, 4, "#ff3860"],
	[2, 5, "#ff3860"],
	[3, 5, "#ff6b8b"],
	[4, 5, "#ff6b8b"],
	[5, 5, "#ff3860"],
	[3, 6, "#ff3860"],
	[4, 6, "#ff3860"],
];

const STAR: Pixel[] = [
	[3, 0, "#fde047"],
	[4, 0, "#fde047"],
	[3, 1, "#fde047"],
	[4, 1, "#fde047"],
	[0, 3, "#fde047"],
	[1, 3, "#fde047"],
	[2, 3, "#facc15"],
	[3, 3, "#fde047"],
	[4, 3, "#fde047"],
	[5, 3, "#facc15"],
	[6, 3, "#fde047"],
	[7, 3, "#fde047"],
	[0, 4, "#fde047"],
	[1, 4, "#fde047"],
	[2, 4, "#facc15"],
	[3, 4, "#fde047"],
	[4, 4, "#fde047"],
	[5, 4, "#facc15"],
	[6, 4, "#fde047"],
	[7, 4, "#fde047"],
	[2, 5, "#fde047"],
	[3, 5, "#facc15"],
	[4, 5, "#facc15"],
	[5, 5, "#fde047"],
	[1, 6, "#fde047"],
	[2, 6, "#fde047"],
	[5, 6, "#fde047"],
	[6, 6, "#fde047"],
	[0, 7, "#fde047"],
	[1, 7, "#fde047"],
	[6, 7, "#fde047"],
	[7, 7, "#fde047"],
];

const FIRE: Pixel[] = [
	[3, 0, "#fde047"],
	[4, 0, "#fde047"],
	[2, 1, "#fb923c"],
	[3, 1, "#fde047"],
	[4, 1, "#fde047"],
	[5, 1, "#fb923c"],
	[2, 2, "#fb923c"],
	[3, 2, "#fde047"],
	[4, 2, "#fde047"],
	[5, 2, "#fb923c"],
	[1, 3, "#ef4444"],
	[2, 3, "#fb923c"],
	[3, 3, "#fde047"],
	[4, 3, "#fde047"],
	[5, 3, "#fb923c"],
	[6, 3, "#ef4444"],
	[1, 4, "#ef4444"],
	[2, 4, "#fb923c"],
	[3, 4, "#fb923c"],
	[4, 4, "#fb923c"],
	[5, 4, "#fb923c"],
	[6, 4, "#ef4444"],
	[0, 5, "#dc2626"],
	[1, 5, "#ef4444"],
	[2, 5, "#fb923c"],
	[3, 5, "#fde047"],
	[4, 5, "#fde047"],
	[5, 5, "#fb923c"],
	[6, 5, "#ef4444"],
	[7, 5, "#dc2626"],
	[0, 6, "#dc2626"],
	[1, 6, "#ef4444"],
	[2, 6, "#ef4444"],
	[3, 6, "#fb923c"],
	[4, 6, "#fb923c"],
	[5, 6, "#ef4444"],
	[6, 6, "#ef4444"],
	[7, 6, "#dc2626"],
	[1, 7, "#dc2626"],
	[2, 7, "#ef4444"],
	[3, 7, "#dc2626"],
	[4, 7, "#dc2626"],
	[5, 7, "#ef4444"],
	[6, 7, "#dc2626"],
];

const SKULL: Pixel[] = [
	[2, 0, "#e5e7eb"],
	[3, 0, "#e5e7eb"],
	[4, 0, "#e5e7eb"],
	[5, 0, "#e5e7eb"],
	[1, 1, "#e5e7eb"],
	[2, 1, "#f3f4f6"],
	[3, 1, "#f3f4f6"],
	[4, 1, "#f3f4f6"],
	[5, 1, "#f3f4f6"],
	[6, 1, "#e5e7eb"],
	[1, 2, "#e5e7eb"],
	[2, 2, "#0f172a"],
	[3, 2, "#f3f4f6"],
	[4, 2, "#f3f4f6"],
	[5, 2, "#0f172a"],
	[6, 2, "#e5e7eb"],
	[1, 3, "#e5e7eb"],
	[2, 3, "#0f172a"],
	[3, 3, "#f3f4f6"],
	[4, 3, "#f3f4f6"],
	[5, 3, "#0f172a"],
	[6, 3, "#e5e7eb"],
	[1, 4, "#e5e7eb"],
	[2, 4, "#f3f4f6"],
	[3, 4, "#0f172a"],
	[4, 4, "#0f172a"],
	[5, 4, "#f3f4f6"],
	[6, 4, "#e5e7eb"],
	[2, 5, "#e5e7eb"],
	[3, 5, "#e5e7eb"],
	[4, 5, "#e5e7eb"],
	[5, 5, "#e5e7eb"],
	[2, 6, "#0f172a"],
	[3, 6, "#e5e7eb"],
	[4, 6, "#0f172a"],
	[5, 6, "#e5e7eb"],
	[2, 7, "#0f172a"],
	[3, 7, "#e5e7eb"],
	[4, 7, "#0f172a"],
	[5, 7, "#e5e7eb"],
];

const SPARKLE: Pixel[] = [
	[3, 0, "#86efac"],
	[4, 0, "#86efac"],
	[3, 1, "#bbf7d0"],
	[4, 1, "#bbf7d0"],
	[0, 3, "#86efac"],
	[1, 3, "#bbf7d0"],
	[2, 3, "#bbf7d0"],
	[3, 3, "#ffffff"],
	[4, 3, "#ffffff"],
	[5, 3, "#bbf7d0"],
	[6, 3, "#bbf7d0"],
	[7, 3, "#86efac"],
	[0, 4, "#86efac"],
	[1, 4, "#bbf7d0"],
	[2, 4, "#bbf7d0"],
	[3, 4, "#ffffff"],
	[4, 4, "#ffffff"],
	[5, 4, "#bbf7d0"],
	[6, 4, "#bbf7d0"],
	[7, 4, "#86efac"],
	[3, 6, "#bbf7d0"],
	[4, 6, "#bbf7d0"],
	[3, 7, "#86efac"],
	[4, 7, "#86efac"],
];

const SPRITES: Record<string, Pixel[]> = {
	"rx-heart": HEART,
	"rx-star": STAR,
	"rx-fire": FIRE,
	"rx-skull": SKULL,
	"rx-sparkle": SPARKLE,
};

function PixelGroup({ pixels }: { pixels: Pixel[] }) {
	return (
		<>
			{pixels.map(([x, y, color], i) => (
				<rect key={i} x={x} y={y} width={1} height={1} fill={color} />
			))}
		</>
	);
}

export default function ReactionSprites() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const node = (
		<svg
			width={0}
			height={0}
			style={{ position: "absolute", width: 0, height: 0 }}
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				{Object.entries(SPRITES).map(([id, pixels]) => (
					<symbol
						key={id}
						id={id}
						viewBox="0 0 8 8"
						width={8}
						height={8}
					>
						<PixelGroup pixels={pixels} />
					</symbol>
				))}
			</defs>
		</svg>
	);

	if (!mounted) return null;
	return createPortal(node, document.body);
}
