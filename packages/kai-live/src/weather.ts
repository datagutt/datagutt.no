// The visitor's weather, from MET Norway's Locationforecast. Framework free: a host adds
// its own caching around fetchWeather (MET asks clients not to poll more than they need).
const FORECAST_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const TIMEOUT_MS = 5_000;

export const WEATHER_KINDS = ["clear", "cloudy", "rain", "heavyRain", "snow", "sleet", "fog", "storm"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

export const isWeatherKind = (value: unknown): value is WeatherKind => WEATHER_KINDS.includes(value as WeatherKind);

/** The weather now where the visitor is, or at the game's fallback place. */
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
	/** The city it is for. */
	place: string;
	/**
	 * True when it came from the forecast. False is the calm fallback (MET was down, or
	 * there is no payload): the game then shows only its seasonal particles.
	 */
	live: boolean;
};

/** No weather to speak of: what the game shows when it has no forecast. */
export const calmWeather = (place: string): WeatherNow => ({
	kind: "clear",
	wind: 0,
	windFrom: 0,
	temperature: null,
	symbol: "",
	place,
	live: false,
});

export type WeatherPlace = { city: string; lat: number; lon: number };

/** Coordinates to one decimal (about 11 km): one forecast per area, and MET asks for few decimals. */
const coarse = (n: number) => Math.round(n * 10) / 10;

/** A place with its coordinates rounded the way forecasts are cached. */
export const weatherPlace = (city: string, lat: number, lon: number): WeatherPlace => ({ city, lat: coarse(lat), lon: coarse(lon) });

/**
 * Where the visitor is, from Vercel's `x-vercel-ip-*` headers (Vercel places each request
 * by IP), or `fallback` when a header is missing or unusable.
 */
export function placeFromHeaders(headers: Pick<Headers, "get">, fallback: WeatherPlace): WeatherPlace {
	const lat = Number(headers.get("x-vercel-ip-latitude"));
	const lon = Number(headers.get("x-vercel-ip-longitude"));
	const raw = headers.get("x-vercel-ip-city");
	if (raw === null || !headers.get("x-vercel-ip-latitude") || !headers.get("x-vercel-ip-longitude")) return fallback;
	if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return fallback;
	// Vercel URL-encodes the city ("S%C3%A3o%20Paulo").
	let city = raw;
	try {
		city = decodeURIComponent(raw);
	} catch {}
	return weatherPlace(city.trim() || fallback.city, lat, lon);
}

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
export function weatherFromSymbol(symbol: string, details: Details, place: string): WeatherNow {
	const wind = finite(details.wind_speed) ? details.wind_speed : 0;
	return {
		kind: kindOf(symbol, details, wind),
		wind,
		windFrom: finite(details.wind_from_direction) ? details.wind_from_direction : 0,
		temperature: finite(details.air_temperature) ? details.air_temperature : null,
		symbol,
		place,
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
export function weatherFromForecast(forecast: unknown, place: string, now = new Date()): WeatherNow | null {
	const steps = (forecast as { properties?: { timeseries?: Step[] } } | null)?.properties?.timeseries;
	if (!Array.isArray(steps) || steps.length === 0) return null;
	const past = steps.filter((s) => Date.parse(s.time) <= now.getTime());
	const step = past.at(-1) ?? steps[0];
	const details = step.data?.instant?.details;
	const symbol = step.data?.next_1_hours?.summary?.symbol_code ?? step.data?.next_6_hours?.summary?.symbol_code;
	if (!details || typeof symbol !== "string") return null;
	return weatherFromSymbol(symbol, details, place);
}

/**
 * The weather now at a place, or calm weather there when MET fails. MET's terms of
 * service block requests whose `userAgent` does not name the site and a contact.
 */
export async function fetchWeather(place: WeatherPlace, userAgent: string): Promise<WeatherNow> {
	try {
		const res = await fetch(`${FORECAST_URL}?lat=${place.lat}&lon=${place.lon}`, {
			headers: { "User-Agent": userAgent, Accept: "application/json" },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const weather = weatherFromForecast(await res.json(), place.city);
		if (!weather) throw new Error("unexpected response");
		return weather;
	} catch (err) {
		console.warn("[weather] forecast failed:", err instanceof Error ? (err.cause ?? err.message) : err);
		return calmWeather(place.city);
	}
}
