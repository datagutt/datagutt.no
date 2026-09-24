import { cacheLife, cacheTag } from "next/cache";
import { CALM_WEATHER, type WeatherKind, type WeatherNow } from "@/content/live";

// The town is Oslo-ish, so the game's sky follows Oslo's (docs/game/PLAN.md C2).
const OSLO = { lat: 59.9139, lon: 10.7522 };
const FORECAST_URL = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${OSLO.lat}&lon=${OSLO.lon}`;
// MET Norway's terms of service block requests that don't identify the site and a contact.
const USER_AGENT = "datagutt.no github.com/datagutt/datagutt.no";
const TIMEOUT_MS = 5_000;

/**
 * How long a good forecast is kept. MET updates hourly and asks clients not to poll more
 * than they need; half an hour keeps the sky current without that. Unvisited for two
 * hours, the next visitor waits for a fresh one rather than seeing a stale sky.
 */
export const WEATHER_CACHE_LIFE = { stale: 300, revalidate: 1_800, expire: 7_200 };

/** Rain in wind from here up ("stiv kuling", Beaufort 7) is a storm. */
const STORM_WIND = 13.9;
/** Fog covering at least this share of the area (%) turns a dry sky to fog. */
const FOG_AREA = 50;
/** An unknown symbol falls back on cloud cover (%): this much or more is cloudy. */
const OVERCAST = 75;

type Details = {
	air_temperature?: number;
	wind_speed?: number;
	wind_from_direction?: number;
	cloud_area_fraction?: number;
	fog_area_fraction?: number;
};
type Summary = { summary?: { symbol_code?: string } };
type Step = { time: string; data: { instant: { details: Details }; next_1_hours?: Summary; next_6_hours?: Summary } };

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The game's weather for one MET symbol code and the instant details beside it. */
export function weatherFromSymbol(symbol: string, details: Details): WeatherNow {
	const wind = finite(details.wind_speed) ? details.wind_speed : 0;
	return {
		kind: kindOf(symbol, details, wind),
		wind,
		windFrom: finite(details.wind_from_direction) ? details.wind_from_direction : 0,
		temperature: finite(details.air_temperature) ? details.air_temperature : null,
		symbol,
		live: true,
	};
}

function kindOf(symbol: string, details: Details, wind: number): WeatherKind {
	// "_day", "_night" and "_polartwilight" only change the icon. MET spells two codes
	// "lightssleet…" and "lightssnow…", so match on parts, not whole names.
	const base = symbol.split("_")[0];
	const thunder = base.includes("thunder");
	let kind: WeatherKind;
	// Snow and sleet follow the symbol, whatever the season in the game.
	if (base.includes("sleet")) kind = "sleet";
	else if (base.includes("snow")) kind = "snow";
	else if (base.includes("rain")) kind = base.startsWith("heavy") ? "heavyRain" : "rain";
	else if (base === "fog") kind = "fog";
	else if (base === "cloudy") kind = "cloudy";
	else if (base === "clearsky" || base === "fair" || base === "partlycloudy") kind = "clear";
	else kind = (details.cloud_area_fraction ?? 0) >= OVERCAST ? "cloudy" : "clear";

	// A storm is wet: thunder or a gale with rain or sleet. Thundersnow stays snow.
	if ((kind === "rain" || kind === "heavyRain" || kind === "sleet") && (thunder || wind >= STORM_WIND)) return "storm";
	if ((kind === "clear" || kind === "cloudy") && (details.fog_area_fraction ?? 0) >= FOG_AREA) return "fog";
	return kind;
}

/**
 * The weather now from a Locationforecast response: the step for the current hour (the
 * first step is often an hour behind), or null if the response isn't the shape we know.
 */
export function weatherFromForecast(forecast: unknown, now = new Date()): WeatherNow | null {
	const steps = (forecast as { properties?: { timeseries?: Step[] } } | null)?.properties?.timeseries;
	if (!Array.isArray(steps) || steps.length === 0) return null;
	const past = steps.filter((s) => Date.parse(s.time) <= now.getTime());
	const step = past.at(-1) ?? steps[0];
	const details = step.data?.instant?.details;
	const symbol = step.data?.next_1_hours?.summary?.symbol_code ?? step.data?.next_6_hours?.summary?.symbol_code;
	if (!details || typeof symbol !== "string") return null;
	return weatherFromSymbol(symbol, details);
}

async function fetchWeather(): Promise<WeatherNow> {
	try {
		const res = await fetch(FORECAST_URL, {
			headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const weather = weatherFromForecast(await res.json());
		if (!weather) throw new Error("unexpected response");
		return weather;
	} catch (err) {
		console.warn("[weather] forecast failed:", err instanceof Error ? (err.cause ?? err.message) : err);
		return CALM_WEATHER;
	}
}

/** Oslo's weather now. Half an hour on success; minutes after a failure, which gets the calm fallback. */
export async function getWeather(): Promise<WeatherNow> {
	"use cache";
	cacheTag("weather");
	const weather = await fetchWeather();
	if (weather.live) cacheLife(WEATHER_CACHE_LIFE);
	else cacheLife("minutes");
	return weather;
}
