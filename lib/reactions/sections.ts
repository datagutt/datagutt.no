"use client";

import {
	REACTION_SECTION_IDS,
	type ReactionSectionId,
} from "./types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function findClosestSection(
	clientX: number,
	clientY: number,
): {
	sectionId: ReactionSectionId;
	normalizedX: number;
	normalizedY: number;
} | null {
	const docY = clientY + window.scrollY;
	for (const id of REACTION_SECTION_IDS) {
		const el = document.getElementById(id);
		if (!el) continue;
		const rect = el.getBoundingClientRect();
		const top = rect.top + window.scrollY;
		const bottom = top + rect.height;
		if (docY >= top && docY < bottom && rect.width > 0) {
			return {
				sectionId: id,
				normalizedX: clamp01((clientX - rect.left) / rect.width),
				normalizedY: clamp01((docY - top) / rect.height),
			};
		}
	}
	return null;
}

export function projectToViewport(
	sectionId: ReactionSectionId,
	nx: number,
	ny: number,
): { x: number; y: number } | null {
	const el = document.getElementById(sectionId);
	if (!el) return null;
	const rect = el.getBoundingClientRect();
	return {
		x: rect.left + nx * rect.width,
		y: rect.top + ny * rect.height,
	};
}
