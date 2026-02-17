const GITHUB_USERNAME = "datagutt";
const YEARS_CODING_SINCE = 2010;

export type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
};

export type GitHubStats = {
  public_repos: number;
  followers: number;
  total_stars: number;
  years_coding: number;
};

export async function getTopRepos(count = 6): Promise<GitHubRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=stars&per_page=${count}&direction=desc`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getGitHubStats(): Promise<GitHubStats> {
  const defaults: GitHubStats = {
    public_repos: 0,
    followers: 0,
    total_stars: 0,
    years_coding: new Date().getFullYear() - YEARS_CODING_SINCE,
  };

  try {
    const userRes = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}`,
      { next: { revalidate: 3600 } },
    );
    if (!userRes.ok) return defaults;
    const user = await userRes.json();

    // Fetch all repos to sum stars
    const reposRes = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`,
      { next: { revalidate: 3600 } },
    );
    const repos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];
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
