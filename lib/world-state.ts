import { cacheLife, cacheTag } from "next/cache";
import type { WorldState } from "@/content/live";
import { getContributions, getGitHubStats, getPinnedRepos } from "./github";
import { getDiscordId } from "./lanyard";

/**
 * Live data for the game (docs/game/PLAN.md M2.2). Its explicit lifetime overrides the
 * inner caches', so it mirrors their rule: hours when everything arrived, minutes if
 * any source came back empty, so a failed fetch is retried soon.
 */
export async function getWorldState(): Promise<WorldState> {
	"use cache";
	cacheTag("github");
	const [repos, stats, contributions] = await Promise.all([getPinnedRepos(), getGitHubStats(), getContributions()]);
	const complete = repos.length > 0 && stats.public_repos > 0 && contributions.length > 0;
	if (complete) cacheLife("hours");
	else cacheLife("minutes");
	return { repos, stats, contributions, discordId: getDiscordId(), fetchedAt: new Date().toISOString() };
}
