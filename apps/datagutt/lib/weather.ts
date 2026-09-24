import { cacheLife, cacheTag } from "next/cache";
import { fetchWeather, placeFromHeaders, type WeatherNow, type WeatherPlace } from "@datagutt/kai-live";
import { FALLBACK_PLACE } from "@/content/live";
import { kaiConfig } from "@/lib/kai";

// The game's sky follows the visitor's weather (docs/game/PLAN.md C2), placed by Vercel's
// IP location headers. Without those (local runs, or a place Vercel can't tell) the sky
// is Oslo's.

const USER_AGENT = kaiConfig.live.weather.userAgent;

/**
 * How long a good forecast is kept. MET updates hourly and asks clients not to poll more
 * than they need; half an hour keeps the sky current without that. Unvisited for two
 * hours, the next visitor waits for a fresh one rather than seeing a stale sky.
 */
const WEATHER_CACHE_LIFE = { stale: 300, revalidate: 1_800, expire: 7_200 };

export const visitorPlace = (headers: Pick<Headers, "get">): WeatherPlace => placeFromHeaders(headers, FALLBACK_PLACE);

/**
 * The weather now at a place, cached per place (the arguments are the cache key). Half an
 * hour on success; minutes after a failure, which gets the calm fallback.
 */
export async function getWeather(place: WeatherPlace = FALLBACK_PLACE): Promise<WeatherNow> {
	"use cache";
	cacheTag("weather");
	const weather = await fetchWeather(place, USER_AGENT);
	if (weather.live) cacheLife(WEATHER_CACHE_LIFE);
	else cacheLife("minutes");
	return weather;
}
