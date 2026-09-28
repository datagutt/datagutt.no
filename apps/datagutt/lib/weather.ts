import { placeFromHeaders, type WeatherNow, type WeatherPlace } from "@datagutt/kai-live";
import { getWeather as cachedWeather } from "@datagutt/kai-next/weather";
import { FALLBACK_PLACE } from "@/content/live";
import { siteLive } from "@/lib/kai";

// The game's sky follows the visitor's weather (docs/PLAN.md C2), placed by Vercel's
// IP location headers. Without those (local runs, or a place Vercel can't tell) the sky
// is Oslo's.

export const visitorPlace = (headers: Pick<Headers, "get">): WeatherPlace => placeFromHeaders(headers, FALLBACK_PLACE);

export const getWeather = (place: WeatherPlace = FALLBACK_PLACE): Promise<WeatherNow> => cachedWeather(place, siteLive.weather.userAgent);
