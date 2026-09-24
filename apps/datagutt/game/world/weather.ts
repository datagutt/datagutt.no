// The weather outdoors (docs/game/PLAN.md C2): Oslo's real weather, which the page embeds
// (lib/weather.ts), or `?debug&weather=<kind>`. This file decides what the sky should hold;
// fx/Weather.ts draws it and audio/mix.ts hears it.
import { isWeatherKind, type WeatherKind, type WeatherNow } from "@datagutt/kai-live";
import type { Season } from "@datagutt/kai/world/season";

/** Wind (m/s) for a debug override, which names only the kind. */
const DEBUG_WIND: Record<WeatherKind, number> = { clear: 2, cloudy: 4, rain: 5, heavyRain: 8, snow: 3, sleet: 6, fog: 1, storm: 18 };

/** The served weather, or the kind asked for with `?debug&weather=<kind>`, blowing from the west. */
export function resolveWeather(search: string, served: WeatherNow): WeatherNow {
	const params = new URLSearchParams(search);
	const asked = params.has("debug") ? params.get("weather") : null;
	if (!isWeatherKind(asked)) return served;
	return { kind: asked, wind: DEBUG_WIND[asked], windFrom: 270, temperature: null, symbol: "debug", place: served.place, live: true };
}

/** What falls: rain streaks, snowflakes, or the season's own particles on a dry day. */
export type FallKind = "rain" | "heavyRain" | "snow" | Season;

export type Sky = {
	/** Each particle kind in the air, with how many relative to its usual rate. */
	falls: { kind: FallKind; density: number }[];
	/** How grey the day is, 0 to 1. */
	overcast: number;
	fog: boolean;
	lightning: boolean;
	/** The wind's sideways push on particles, in px/s; positive blows east (right). */
	drift: number;
	/** Nothing between the town and the sky: the aurora can show. */
	clear: boolean;
};

/** Screen pixels per second of sideways drift for each m/s of wind. */
const DRIFT_PER_MS = 4;
const MAX_DRIFT = 80;

const OVERCAST: Record<WeatherKind, number> = { clear: 0, cloudy: 0.1, fog: 0.1, snow: 0.08, rain: 0.16, sleet: 0.16, heavyRain: 0.22, storm: 0.3 };

export function skyFor(season: Season, weather: WeatherNow): Sky {
	// The game looks straight down, so only the east–west part of the wind shows.
	const east = -Math.sin((weather.windFrom * Math.PI) / 180) * weather.wind * DRIFT_PER_MS;
	const drift = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, Math.round(east)));
	const sky = { overcast: OVERCAST[weather.kind], fog: weather.kind === "fog", lightning: weather.kind === "storm", drift, clear: weather.kind === "clear" };
	switch (weather.kind) {
		case "rain":
			return { ...sky, falls: [{ kind: "rain", density: 1 }] };
		case "heavyRain":
			return { ...sky, falls: [{ kind: "heavyRain", density: 1 }] };
		case "storm":
			return { ...sky, falls: [{ kind: "heavyRain", density: 1.3 }] };
		case "sleet":
			return { ...sky, falls: [{ kind: "rain", density: 0.5 }, { kind: "snow", density: 0.6 }] };
		case "snow":
			return { ...sky, falls: [{ kind: "snow", density: 1 }] };
	}
	// A dry day keeps the season's particles, except winter's snow: snow comes from the
	// forecast. Without a forecast (the calm fallback), winter keeps a gentle seasonal snowfall.
	if (season === "winter" && weather.live) return { ...sky, falls: [] };
	return { ...sky, falls: [{ kind: season, density: 1 }] };
}

/** Snow falls silently. */
const RAIN_SOUND: Record<WeatherKind, number> = { clear: 0, cloudy: 0, fog: 0, snow: 0, sleet: 0.4, rain: 0.6, heavyRain: 1, storm: 1 };
/** Wind this strong (m/s) or more is as loud as the wind gets. */
const LOUDEST_WIND = 15;

/** How loud the weather is, for the ambience: rain 0 to 1, wind 0 to 1, thunder or not. */
export function weatherSound(weather: WeatherNow): { rain: number; wind: number; thunder: boolean } {
	return { rain: RAIN_SOUND[weather.kind], wind: Math.min(1, weather.wind / LOUDEST_WIND), thunder: weather.kind === "storm" };
}
