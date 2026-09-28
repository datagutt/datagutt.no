// The live data a host page embeds as JSON for the game, and how the game reads it back.
// Anything missing or malformed falls back to the game's empty state: the game must still
// boot, for example in the standalone dev harness or when GitHub was unreachable at
// render time.
import type { ContributionDay, GitHubStats, PinnedRepo } from "./github.ts";
import { calmWeather, isWeatherKind, type WeatherNow } from "./weather.ts";

/** Everything live the game needs. */
export type WorldState = {
	repos: PinnedRepo[];
	stats: GitHubStats;
	contributions: ContributionDay[];
	/** Discord user to follow on Lanyard. */
	discordId: string;
	weather: WeatherNow;
	/** ISO time the data was fetched. */
	fetchedAt: string;
};

export const WORLD_STATE_ELEMENT_ID = "world-state";

/** The state before anything is fetched: the game's own Discord user and fallback place. */
export const emptyWorldState = ({ discordId, place }: { discordId: string; place: string }): WorldState => ({
	repos: [],
	stats: { public_repos: 0, followers: 0, total_stars: 0, years_coding: 0 },
	contributions: [],
	discordId,
	weather: calmWeather(place),
	fetchedAt: new Date(0).toISOString(),
});

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function parseWeather(raw: Partial<WeatherNow> | undefined, calm: WeatherNow): WeatherNow {
	if (!raw || !isWeatherKind(raw.kind)) return calm;
	return {
		kind: raw.kind,
		wind: finite(raw.wind) ? Math.max(0, raw.wind) : 0,
		windFrom: finite(raw.windFrom) ? raw.windFrom : 0,
		temperature: finite(raw.temperature) ? raw.temperature : null,
		symbol: typeof raw.symbol === "string" ? raw.symbol : "",
		place: typeof raw.place === "string" && raw.place ? raw.place : calm.place,
		live: raw.live === true,
	};
}

export function parseWorldState(json: string | null | undefined, empty: WorldState): WorldState {
	if (!json) return empty;
	try {
		const raw = JSON.parse(json) as Partial<WorldState>;
		return {
			repos: Array.isArray(raw.repos) ? raw.repos : [],
			stats: { ...empty.stats, ...(raw.stats ?? {}) },
			contributions: Array.isArray(raw.contributions) ? raw.contributions : [],
			// A Discord id is a snowflake: digits only.
			discordId: typeof raw.discordId === "string" && /^\d+$/.test(raw.discordId) ? raw.discordId : empty.discordId,
			weather: parseWeather(raw.weather, empty.weather),
			fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : empty.fetchedAt,
		};
	} catch {
		return empty;
	}
}

export function readWorldState(empty: WorldState, doc: Document = document): WorldState {
	return parseWorldState(doc.getElementById(WORLD_STATE_ELEMENT_ID)?.textContent, empty);
}
