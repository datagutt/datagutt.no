import { cacheLife, cacheTag } from "next/cache";
import { parse } from "node-html-parser";
import type { ContributionDay, GitHubStats, PinnedRepo } from "@datagutt/kai-live";
import { profile } from "@/content/profile";

const GITHUB_USERNAME = "datagutt";
const YEARS_CODING_SINCE = profile.codingSince;

export type { PinnedRepo, GitHubStats, ContributionDay };

/**
 * Each fetcher reports whether it got real data. Successes are cached for hours;
 * failures only for minutes, so one network hiccup doesn't blank the site for an hour.
 */
type Fetched<T> = { ok: boolean; data: T };

function warn(what: string, err: unknown) {
  const cause = err instanceof Error ? (err.cause ?? err.message) : err;
  console.warn(`[github] ${what} failed:`, cause);
}

// --- Pinned repos (scraped from GitHub profile) ---

async function fetchPinnedRepos(): Promise<Fetched<PinnedRepo[]>> {
  let html: string;
  try {
    const res = await fetch(`https://github.com/${GITHUB_USERNAME}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      warn("pinned repos", `HTTP ${res.status}`);
      return { ok: false, data: [] };
    }
    html = await res.text();
  } catch (err) {
    warn("pinned repos", err);
    return { ok: false, data: [] };
  }
  const root = parse(html);

  const repos = root.querySelectorAll(".js-pinned-item-list-item").map((el) => {
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
  return { ok: true, data: repos };
}

export async function getPinnedRepos(): Promise<PinnedRepo[]> {
  "use cache";
  cacheTag("github");
  const result = await fetchPinnedRepos();
  if (result.ok) cacheLife("hours");
  else cacheLife("minutes");
  return result.data;
}

// --- GitHub stats ---

async function fetchGitHubStats(): Promise<Fetched<GitHubStats>> {
  const defaults: GitHubStats = {
    public_repos: 0,
    followers: 0,
    total_stars: 0,
    years_coding: new Date().getFullYear() - YEARS_CODING_SINCE,
  };

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USERNAME}`),
      fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`),
    ]);
    if (!userRes.ok || !reposRes.ok) {
      warn("stats", `HTTP ${userRes.status}/${reposRes.status}`);
      return { ok: false, data: defaults };
    }
    const user = await userRes.json();
    const repos: { stargazers_count: number }[] = await reposRes.json();
    const total_stars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    return {
      ok: true,
      data: {
        public_repos: user.public_repos ?? defaults.public_repos,
        followers: user.followers ?? defaults.followers,
        total_stars,
        years_coding: defaults.years_coding,
      },
    };
  } catch (err) {
    warn("stats", err);
    return { ok: false, data: defaults };
  }
}

export async function getGitHubStats(): Promise<GitHubStats> {
  "use cache";
  cacheTag("github");
  const result = await fetchGitHubStats();
  if (result.ok) cacheLife("hours");
  else cacheLife("minutes");
  return result.data;
}

// --- Contributions ---

async function fetchContributions(): Promise<Fetched<ContributionDay[]>> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`,
    );
    if (!res.ok) {
      warn("contributions", `HTTP ${res.status}`);
      return { ok: false, data: [] };
    }
    const data = await res.json();
    return { ok: true, data: data.contributions ?? [] };
  } catch (err) {
    warn("contributions", err);
    return { ok: false, data: [] };
  }
}

export async function getContributions(): Promise<ContributionDay[]> {
  "use cache";
  cacheTag("github");
  const result = await fetchContributions();
  if (result.ok) cacheLife("hours");
  else cacheLife("minutes");
  return result.data;
}
