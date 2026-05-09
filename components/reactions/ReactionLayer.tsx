"use client";

import { useEffect, useState } from "react";
import { projectToViewport } from "../../lib/reactions/sections";
import type {
	ReactionSectionId,
	ReactionType,
} from "../../lib/reactions/types";
import ReactionSprite from "./ReactionSprite";

export type ActiveDrop = {
	id: string;
	type: ReactionType;
	sectionId: ReactionSectionId;
	nx: number;
	ny: number;
};

type Props = {
	drops: ActiveDrop[];
	reducedMotion: boolean;
};

type Projected = {
	id: string;
	type: ReactionType;
	x: number;
	y: number;
};

export default function ReactionLayer({ drops, reducedMotion }: Props) {
	const [projected, setProjected] = useState<Projected[]>([]);

	useEffect(() => {
		if (drops.length === 0) {
			setProjected([]);
			return;
		}

		let raf = 0;
		const tick = () => {
			const next: Projected[] = [];
			for (const d of drops) {
				const p = projectToViewport(d.sectionId, d.nx, d.ny);
				if (!p) continue;
				next.push({ id: d.id, type: d.type, x: p.x, y: p.y });
			}
			setProjected((prev) => {
				if (prev.length !== next.length) return next;
				for (let i = 0; i < prev.length; i++) {
					const a = prev[i];
					const b = next[i];
					if (a.id !== b.id || a.x !== b.x || a.y !== b.y) return next;
				}
				return prev;
			});
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [drops]);

	return (
		<>
			{projected.map((d) => (
				<ReactionSprite
					key={d.id}
					type={d.type}
					x={d.x}
					y={d.y}
					reducedMotion={reducedMotion}
				/>
			))}
		</>
	);
}
