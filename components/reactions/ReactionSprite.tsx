"use client";

import type { ReactionType } from "../../lib/reactions/types";

type Props = {
	type: ReactionType;
	x: number;
	y: number;
	reducedMotion: boolean;
};

export default function ReactionSprite({ type, x, y, reducedMotion }: Props) {
	const animClass = reducedMotion
		? "rx-anim-fade"
		: type === "ripple"
			? "rx-anim-ripple"
			: "rx-anim-pop";

	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute ${animClass}`}
			style={{
				left: x,
				top: y,
				transform: "translate(-50%, -50%)",
				willChange: "transform, opacity",
			}}
		>
			{type === "ripple" ? (
				<RippleGlyph />
			) : (
				<svg
					width={32}
					height={32}
					viewBox="0 0 8 8"
					shapeRendering="crispEdges"
					style={{ imageRendering: "pixelated" }}
				>
					<use href={`#rx-${type}`} />
				</svg>
			)}
		</div>
	);
}

function RippleGlyph() {
	return (
		<svg
			width={32}
			height={32}
			viewBox="0 0 8 8"
			shapeRendering="crispEdges"
			className="text-primary-500"
			style={{ imageRendering: "pixelated" }}
		>
			{/* hollow chunky pixel ring */}
			{[
				[3, 0],
				[4, 0],
				[2, 1],
				[5, 1],
				[1, 2],
				[6, 2],
				[0, 3],
				[7, 3],
				[0, 4],
				[7, 4],
				[1, 5],
				[6, 5],
				[2, 6],
				[5, 6],
				[3, 7],
				[4, 7],
			].map(([cx, cy]) => (
				<rect
					key={`${cx}-${cy}`}
					x={cx}
					y={cy}
					width={1}
					height={1}
					fill="currentColor"
				/>
			))}
		</svg>
	);
}
