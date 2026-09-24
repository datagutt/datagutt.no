// Shapes of the live data fetched on the server (lib/github.ts) and handed to the game
// and the Journal. Plain types only, so game/ can depend on them.
import { profile } from "./profile";

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

export const WEATHER_KINDS = ["clear", "cloudy", "rain", "heavyRain", "snow", "sleet", "fog", "storm"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

export const isWeatherKind = (value: unknown): value is WeatherKind => WEATHER_KINDS.includes(value as WeatherKind);

/** The weather in Oslo now, from MET Norway (lib/weather.ts). */
export type WeatherNow = {
	kind: WeatherKind;
	/** Wind speed in m/s. */
	wind: number;
	/** Where the wind blows from, in degrees: 0 north, 90 east. */
	windFrom: number;
	/** Air temperature in °C, or null when unknown. */
	temperature: number | null;
	/** MET's symbol code it was read from ("clearsky_day", "heavyrain"); empty when not live. */
	symbol: string;
	/**
	 * True when it came from the forecast. False is the calm fallback (MET was down, or the
	 * dev harness has no payload): the game then shows only its seasonal particles.
	 */
	live: boolean;
};

export const CALM_WEATHER: WeatherNow = { kind: "clear", wind: 0, windFrom: 0, temperature: null, symbol: "", live: false };

/** Everything live the game needs, embedded in the page as JSON (docs/game/PLAN.md M2.2). */
export type WorldState = {
	repos: PinnedRepo[];
	stats: GitHubStats;
	contributions: ContributionDay[];
	/** Discord user to follow on Lanyard (lib/lanyard.ts getDiscordId). */
	discordId: string;
	weather: WeatherNow;
	/** ISO time the data was fetched. */
	fetchedAt: string;
};

export const WORLD_STATE_ELEMENT_ID = "world-state";

export const EMPTY_WORLD_STATE: WorldState = {
	repos: [],
	stats: { public_repos: 0, followers: 0, total_stars: 0, years_coding: 0 },
	contributions: [],
	discordId: profile.discordId,
	weather: CALM_WEATHER,
	fetchedAt: new Date(0).toISOString(),
};
