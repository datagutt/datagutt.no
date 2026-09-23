import type { ContributionDay } from "@/content/live";
import { placePresenting } from "@/content/places";
import { getWorldState } from "@/lib/world-state";
import { Section } from "./Section";

const LEVEL_FILL = ["#e7dcc3", "#a8d5b0", "#6fbf84", "#3f9a5c", "#1f6b3a"];

/** The last year of contributions as a GitHub-style grid: one column a week. Decoration; the text says the same. */
function ContributionGrid({ days }: { days: ContributionDay[] }) {
	const recent = days.slice(-53 * 7);
	const offset = recent.length ? new Date(`${recent[0].date}T00:00:00Z`).getUTCDay() : 0;
	const cells = recent.map((d, i) => ({ ...d, col: Math.floor((i + offset) / 7), row: (i + offset) % 7 }));
	const cols = cells.length ? cells.at(-1)!.col + 1 : 0;
	return (
		<svg viewBox={`0 0 ${cols * 4} 28`} className="mt-4 h-auto w-full max-w-xl" shapeRendering="crispEdges" aria-hidden="true">
			{cells.map((c) => (
				<rect key={c.date} x={c.col * 4} y={c.row * 4} width={3} height={3} fill={LEVEL_FILL[c.level]} />
			))}
		</svg>
	);
}

/** Open source and stats: live from GitHub, cached for hours (lib/world-state.ts). */
export async function LiveSections() {
	const { repos, stats, contributions } = await getWorldState();
	const lastYear = contributions.slice(-365);
	const total = lastYear.reduce((sum, d) => sum + d.count, 0);
	const busiest = lastYear.reduce<ContributionDay | null>((best, d) => (!best || d.count > best.count ? d : best), null);

	return (
		<>
			<Section id="open-source" title="Open source" place={placePresenting("repos")}>
				{repos.length === 0 ? (
					<p>
						GitHub didn&apos;t answer just now. The repositories are at{" "}
						<a className="underline" href="https://github.com/datagutt">
							github.com/datagutt
						</a>
						.
					</p>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2">
						{repos.map((repo) => (
							<li key={`${repo.author}/${repo.name}`} className="border-2 border-[#1b2440] bg-[#fffaf0] p-4">
								<h3 className="font-semibold">
									<a className="underline" href={`https://github.com/${repo.author}/${repo.name}`}>
										{repo.author}/{repo.name}
									</a>
								</h3>
								{repo.description && <p className="mt-1 text-sm">{repo.description}</p>}
								<p className="mt-2 text-sm text-[#1b2440]/80">
									{[repo.language, `${repo.stars} ${repo.stars === 1 ? "star" : "stars"}`, `${repo.forks} ${repo.forks === 1 ? "fork" : "forks"}`]
										.filter(Boolean)
										.join(" · ")}
								</p>
							</li>
						))}
					</ul>
				)}
			</Section>

			<Section id="stats" title="Stats" place={placePresenting("stats")}>
				<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{[
						["Public repositories", stats.public_repos],
						["Followers", stats.followers],
						["Stars", stats.total_stars],
						["Years coding", stats.years_coding],
					].map(([label, value]) => (
						<div key={label} className="border-2 border-[#1b2440] bg-[#fffaf0] p-3">
							<dt className="text-sm">{label}</dt>
							<dd className="font-pixel text-2xl">{value}</dd>
						</div>
					))}
				</dl>
				{lastYear.length > 0 && (
					<>
						<p className="mt-6">
							{total.toLocaleString("en")} contributions on GitHub in the last year
							{busiest && busiest.count > 0 ? `, the most on ${new Date(`${busiest.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} (${busiest.count})` : ""}. In the
							game they grow as crops on the farm.
						</p>
						<ContributionGrid days={contributions} />
					</>
				)}
			</Section>
		</>
	);
}
