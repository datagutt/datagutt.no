// A GitHub user's live data: pinned repos (scraped from the profile page, which the API
// does not offer), stats from the REST API, and the contribution calendar from a public
// mirror. Framework free: a host caches the results (@datagutt/kai-next/github).
import { parse } from "node-html-parser";
import type { ContributionDay, GitHubStats, PinnedRepo } from "../github.ts";

/**
 * What a fetch got, and whether it was real data: a host keeps a success for long and a
 * failure only briefly, so one network hiccup doesn't blank the site for an hour.
 */
export type Fetched<T> = { ok: boolean; data: T };

function warn(what: string, err: unknown) {
  const cause = err instanceof Error ? (err.cause ?? err.message) : err;
  console.warn(`[github] ${what} failed:`, cause);
}

// --- Pinned repos (scraped from GitHub profile) ---

export async function fetchPinnedRepos(user: string): Promise<Fetched<PinnedRepo[]>> {
  let html: string;
  try {
    const res = await fetch(`https://github.com/${user}`, {
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

// --- GitHub stats ---

/** `codingSince`: the year the user started, for `years_coding`. */
export async function fetchGitHubStats(user: string, codingSince: number): Promise<Fetched<GitHubStats>> {
  const defaults: GitHubStats = {
    public_repos: 0,
    followers: 0,
    total_stars: 0,
    years_coding: new Date().getFullYear() - codingSince,
  };

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${user}`),
      fetch(`https://api.github.com/users/${user}/repos?per_page=100`),
    ]);
    if (!userRes.ok || !reposRes.ok) {
      warn("stats", `HTTP ${userRes.status}/${reposRes.status}`);
      return { ok: false, data: defaults };
    }
    const account = await userRes.json();
    const repos: { stargazers_count: number }[] = await reposRes.json();
    const total_stars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    return {
      ok: true,
      data: {
        public_repos: account.public_repos ?? defaults.public_repos,
        followers: account.followers ?? defaults.followers,
        total_stars,
        years_coding: defaults.years_coding,
      },
    };
  } catch (err) {
    warn("stats", err);
    return { ok: false, data: defaults };
  }
}

// --- Contributions ---

export async function fetchContributions(user: string): Promise<Fetched<ContributionDay[]>> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${user}?y=last`,
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
