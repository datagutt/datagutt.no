import { cache } from "react";
import { unstable_cache } from "next/cache";
import { parse } from "node-html-parser";

const GITHUB_USERNAME = "datagutt";
const YEARS_CODING_SINCE = 2010;

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

// --- Pinned repos (scraped from GitHub profile) ---

async function fetchPinnedRepos(): Promise<PinnedRepo[]> {
  const res = await fetch(`https://github.com/${GITHUB_USERNAME}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const root = parse(html);

  return root
    .querySelectorAll(".js-pinned-item-list-item")
    .map((el) => {
      const repoPath =
        el.querySelector("a")?.getAttribute("href")?.split("/") || [];
      const [, author = "", name = ""] = repoPath;

      const parseMetric = (index: number): number => {
        try {
          return (
            Number(
              el
                .querySelectorAll("a.pinned-item-meta")
                [index]?.text?.replace(/\n/g, "")
                .trim(),
            ) || 0
          );
        } catch {
          return 0;
        }
      };

      const languageSpan = el.querySelector(
        "span[itemprop='programmingLanguage']",
      );
      const languageColorSpan = languageSpan?.parentNode?.querySelector(
        ".repo-language-color",
      );

      return {
        author,
        name,
        description:
          el
            .querySelector("p.pinned-item-desc")
            ?.text?.replace(/\n/g, "")
            .trim() || "",
        language: languageSpan?.text || "",
        languageColor:
          languageColorSpan
            ?.getAttribute("style")
            ?.match(/background-color:\s*([^;]+)/)?.[1] || "",
        stars: parseMetric(0),
        forks: parseMetric(1),
      };
    });
}

const getCachedPinnedRepos = unstable_cache(fetchPinnedRepos, ["pinned-repos"], {
  revalidate: 3600,
});

export const getPinnedRepos = cache(getCachedPinnedRepos);

// --- GitHub stats ---

async function fetchGitHubStats(): Promise<GitHubStats> {
  const defaults: GitHubStats = {
    public_repos: 0,
    followers: 0,
    total_stars: 0,
    years_coding: new Date().getFullYear() - YEARS_CODING_SINCE,
  };

  try {
    const userRes = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}`,
    );
    if (!userRes.ok) return defaults;
    const user = await userRes.json();

    const reposRes = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`,
    );
    const repos: { stargazers_count: number }[] = reposRes.ok
      ? await reposRes.json()
      : [];
    const total_stars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    return {
      public_repos: user.public_repos ?? defaults.public_repos,
      followers: user.followers ?? defaults.followers,
      total_stars,
      years_coding: defaults.years_coding,
    };
  } catch {
    return defaults;
  }
}

const getCachedGitHubStats = unstable_cache(
  fetchGitHubStats,
  ["github-stats"],
  { revalidate: 3600 },
);

export const getGitHubStats = cache(getCachedGitHubStats);

// --- Contributions ---

async function fetchContributions(): Promise<ContributionDay[]> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.contributions ?? [];
  } catch {
    return [];
  }
}

const getCachedContributions = unstable_cache(
  fetchContributions,
  ["github-contributions"],
  { revalidate: 3600 },
);

export const getContributions = cache(getCachedContributions);
