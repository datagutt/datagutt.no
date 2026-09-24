// Achievements (docs/game/PLAN.md B3): small things to find beyond the passport, listed
// on the passport's second page. Earned ones are kept as `achievement:<id>` flags in the
// save, so old saves need nothing new.

export type Achievement = { id: string; name: string; how: string };

/** In the order the passport lists them. `how` shows once earned; before that, "???". */
export const ACHIEVEMENTS = [
	{ id: "passport", name: "Full passport", how: "Every stamp in town." },
	{ id: "credits", name: "Roll credits", how: "Stayed on the pier for the credits." },
	{ id: "summit", name: "Up the mountain", how: "Walked the trail up to the hytte." },
	{ id: "wake", name: "Rise and shine", how: "Woke Thomas up." },
	{ id: "cat", name: "Cat person", how: "Found the cat, and petted it." },
	{ id: "edge", name: "Edge of the world", how: "Tried to walk off the map." },
	{ id: "stars", name: "Stargazer", how: "Looked at the stars from the radio hill." },
	{ id: "blocks", name: "High score", how: "1,000 points at falling blocks." },
] as const satisfies readonly Achievement[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];

/** The falling blocks score that earns "High score". */
export const BLOCKS_TARGET = 1000;

export const achievementFlag = (id: AchievementId) => `achievement:${id}`;

export const achievement = (id: AchievementId): Achievement => ACHIEVEMENTS.find((a) => a.id === id)!;

/** The lines the map's edge says when someone walks into it, in turn. */
export const EDGE_LINES = [
	"* The map ends here. Past this point it's all placeholder grass, and nobody wants that.",
	"* You lean on the edge of the world. It holds.",
	"* A small sign would say HERE BE NOTHING, if anyone had bothered to put one up.",
	"* Somewhere a level designer winces.",
];
