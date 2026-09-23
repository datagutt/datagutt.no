// Shapes of the live data fetched on the server (lib/github.ts) and handed to the game
// and the Journal. Plain types only, so game/ can depend on them.
import { profile } from "./profile";

export type PinnedRepo = {
	author: string;
	name: string;
	description: string;
	language: string;
	languageColor: string;
	stars: number;
	forks: number;
};

export type GitHubStats = {
	public_repos: number;
	followers: number;
	total_stars: number;
	years_coding: number;
};

export type ContributionDay = {
	date: string;
	count: number;
	level: 0 | 1 | 2 | 3 | 4;
};

/** Everything live the game needs, embedded in the page as JSON (docs/game/PLAN.md M2.2). */
export type WorldState = {
	repos: PinnedRepo[];
	stats: GitHubStats;
	contributions: ContributionDay[];
	/** Discord user to follow on Lanyard (lib/lanyard.ts getDiscordId). */
	discordId: string;
	/** ISO time the data was fetched. */
	fetchedAt: string;
};

export const WORLD_STATE_ELEMENT_ID = "world-state";

export const EMPTY_WORLD_STATE: WorldState = {
	repos: [],
	stats: { public_repos: 0, followers: 0, total_stars: 0, years_coding: 0 },
	contributions: [],
	discordId: profile.discordId,
	fetchedAt: new Date(0).toISOString(),
};
