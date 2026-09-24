import { cacheLife, cacheTag } from "next/cache";
import type { WorldState } from "@/content/live";
import { getContributions, getGitHubStats, getPinnedRepos } from "./github";
import { getDiscordId } from "./lanyard";
import { getWeather, WEATHER_CACHE_LIFE } from "./weather";

/**
 * Live data for the game (docs/game/PLAN.md M2.2). Its explicit lifetime overrides the
 * inner caches', so it mirrors their rule: as long as the weather lasts (half an hour,
 * the shortest-lived source) when everything arrived, minutes if any source came back
 * empty, so a failed fetch is retried soon.
 */
export async function getWorldState(): Promise<WorldState> {
	"use cache";
	cacheTag("github", "weather");
	const [repos, stats, contributions, weather] = await Promise.all([getPinnedRepos(), getGitHubStats(), getContributions(), getWeather()]);
	const complete = repos.length > 0 && stats.public_repos > 0 && contributions.length > 0 && weather.live;
	if (complete) cacheLife(WEATHER_CACHE_LIFE);
	else cacheLife("minutes");
	return { repos, stats, contributions, discordId: getDiscordId(), weather, fetchedAt: new Date().toISOString() };
}
