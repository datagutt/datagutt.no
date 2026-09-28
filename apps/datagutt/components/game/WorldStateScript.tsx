import { headers } from "next/headers";
import type { WorldState } from "@datagutt/kai-live";
import { LiveDataScript } from "@datagutt/kai-next/live-data";
import { getWeather, visitorPlace } from "@/lib/weather";
import { getWorldState } from "@/lib/world-state";

/**
 * Embeds the live world data as JSON for the game to read at boot. The weather is the
 * visitor's own (by Vercel's IP location, else Oslo), so this renders per request, inside
 * the page's Suspense boundary; the title screen around it stays prerendered.
 */
export async function WorldStateScript() {
	const place = visitorPlace(await headers());
	const [world, weather] = await Promise.all([getWorldState(), getWeather(place)]);
	const state: WorldState = { ...world, weather };
	return <LiveDataScript data={state} />;
}
