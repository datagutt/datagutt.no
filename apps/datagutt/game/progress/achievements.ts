// Achievements (docs/game/PLAN.md B3): small things to find beyond the passport, listed
// on the passport's second page. Earned ones are kept as `achievement:<id>` flags in the
// save, so old saves need nothing new.

import { content } from "../../content/index.ts";

export type Achievement = (typeof content.achievements.list)[number];
export type AchievementId = string;

/** In the order the passport lists them (content/achievements.json). `how` shows once earned; before that, "???". */
export const ACHIEVEMENTS: Achievement[] = content.achievements.list;

/** The falling blocks score that earns "High score". */
export const BLOCKS_TARGET = 1000;

export const achievementFlag = (id: AchievementId) => `achievement:${id}`;

export function achievement(id: AchievementId): Achievement {
	const found = ACHIEVEMENTS.find((a) => a.id === id);
	if (!found) throw new Error(`Unknown achievement "${id}"`);
	return found;
}

/** The lines the map's edge says when someone walks into it, in turn. */
export const EDGE_LINES = [
	"* The map ends here. Past this point it's all placeholder grass, and nobody wants that.",
	"* You lean on the edge of the world. It holds.",
	"* A small sign would say HERE BE NOTHING, if anyone had bothered to put one up.",
	"* Somewhere a level designer winces.",
];
