// The weather at a place (@datagutt/kai-live's MET Norway fetcher), cached by Next per
// place: half an hour on success, minutes after a failure, which gets calm weather.
import { cacheLife, cacheTag } from "next/cache";
import { fetchWeather, type WeatherNow, type WeatherPlace } from "@datagutt/kai-live";

/**
 * MET updates hourly and asks clients not to poll more than they need; half an hour keeps
 * the sky current without that. Unvisited for two hours, the next visitor waits for a
 * fresh forecast rather than seeing a stale sky.
 */
const WEATHER_CACHE_LIFE = { stale: 300, revalidate: 1_800, expire: 7_200 };

/** `userAgent`: MET's terms require one that names the site and a contact. */
export async function getWeather(place: WeatherPlace, userAgent: string): Promise<WeatherNow> {
	"use cache";
	cacheTag("weather");
	const weather = await fetchWeather(place, userAgent);
	if (weather.live) cacheLife(WEATHER_CACHE_LIFE);
	else cacheLife("minutes");
	return weather;
}
