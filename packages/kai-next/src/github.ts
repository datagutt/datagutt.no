// The GitHub fetchers of @datagutt/kai-live, cached by Next: hours after a success,
// minutes after a failure, so a failed fetch is retried soon. The arguments are the cache
// key. Failures are logged as `[github] … failed`.
import { cacheLife, cacheTag } from "next/cache";
import type { ContributionDay, GitHubStats, PinnedRepo } from "@datagutt/kai-live";
import { fetchContributions, fetchGitHubStats, fetchPinnedRepos, type Fetched } from "@datagutt/kai-live/github/fetch";

function keep<T>(result: Fetched<T>): T {
	if (result.ok) cacheLife("hours");
	else cacheLife("minutes");
	return result.data;
}

export async function getPinnedRepos(user: string): Promise<PinnedRepo[]> {
	"use cache";
	cacheTag("github");
	return keep(await fetchPinnedRepos(user));
}

export async function getGitHubStats(user: string, codingSince: number): Promise<GitHubStats> {
	"use cache";
	cacheTag("github");
	return keep(await fetchGitHubStats(user, codingSince));
}

export async function getContributions(user: string): Promise<ContributionDay[]> {
	"use cache";
	cacheTag("github");
	return keep(await fetchContributions(user));
}
