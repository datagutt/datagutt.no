// Shapes of the GitHub data a host fetches on the server and hands to the game.

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
