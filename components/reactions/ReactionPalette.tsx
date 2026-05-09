"use client";

import { useEffect, useRef } from "react";
import type { ReactionType } from "../../lib/reactions/types";

const CHIPS: { type: Exclude<ReactionType, "ripple">; label: string }[] = [
	{ type: "heart", label: "Heart" },
	{ type: "star", label: "Star" },
	{ type: "fire", label: "Fire" },
	{ type: "skull", label: "Skull" },
	{ type: "sparkle", label: "Sparkle" },
];

type Props = {
	x: number;
	y: number;
	onPick: (type: Exclude<ReactionType, "ripple">) => void;
	onClose: () => void;
};

const RADIUS = 56;
const IDLE_TIMEOUT_MS = 5000;

export default function ReactionPalette({ x, y, onPick, onClose }: Props) {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		const onPointerDown = (e: PointerEvent) => {
			if (rootRef.current?.contains(e.target as Node)) return;
			onClose();
		};
		const idle = window.setTimeout(onClose, IDLE_TIMEOUT_MS);

		document.addEventListener("keydown", onKey);
		window.addEventListener("pointerdown", onPointerDown, { capture: true });
		return () => {
			window.clearTimeout(idle);
			document.removeEventListener("keydown", onKey);
			window.removeEventListener("pointerdown", onPointerDown, {
				capture: true,
			});
		};
	}, [onClose]);

	return (
		<div
			ref={rootRef}
			role="menu"
			aria-label="Pick a reaction"
			data-no-reactions
			className="pointer-events-auto absolute z-[70]"
			style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
		>
			{CHIPS.map((chip, i) => {
				const angle = (i / CHIPS.length) * Math.PI * 2 - Math.PI / 2;
				const cx = Math.cos(angle) * RADIUS;
				const cy = Math.sin(angle) * RADIUS;
				return (
					<button
						key={chip.type}
						role="menuitem"
						aria-label={`React with ${chip.label.toLowerCase()}`}
						onClick={() => onPick(chip.type)}
						className="rx-palette-chip absolute w-9 h-9 rounded-md border border-primary-700/60 bg-primary-950/80 backdrop-blur-sm flex items-center justify-center hover:border-primary-500/80 hover:bg-primary-900/80 transition-colors"
						style={{
							left: cx,
							top: cy,
							transform: "translate(-50%, -50%)",
							animationDelay: `${i * 30}ms`,
						}}
					>
						<svg
							width={20}
							height={20}
							viewBox="0 0 8 8"
							shapeRendering="crispEdges"
							style={{ imageRendering: "pixelated" }}
						>
							<use href={`#rx-${chip.type}`} />
						</svg>
					</button>
				);
			})}
		</div>
	);
}
