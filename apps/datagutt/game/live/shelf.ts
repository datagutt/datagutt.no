// The library's featured shelf (M3.11): one book spine per pinned repo, in the repo's
// language colour, standing on the shelf with a little variety in height and width.
import type { PinnedRepo } from "@datagutt/kai-live";

export type Spine = { x: number; y: number; w: number; h: number; color: number; edge: number };

const FALLBACK = "#8a8f98";

function shade(hex: string, f: number): number {
	const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
	const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
	return (c(16) << 16) | (c(8) << 8) | c(0);
}

/** Spines in pixels, relative to the shelf area's top-left; bottoms rest on `baseline`. */
export function spines(repos: PinnedRepo[], width: number, baseline: number): Spine[] {
	const out: Spine[] = [];
	let x = 3;
	repos.forEach((repo, i) => {
		const w = 3 + (i % 2);
		const h = 9 + ((i * 5) % 4);
		if (x + w > width - 2) return;
		const color = repo.languageColor || FALLBACK;
		out.push({ x, y: baseline - h, w, h, color: shade(color, 1), edge: shade(color, 0.55) });
		x += w + 1;
	});
	return out;
}
