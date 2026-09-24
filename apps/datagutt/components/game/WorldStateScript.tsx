import { headers } from "next/headers";
import { WORLD_STATE_ELEMENT_ID, type WorldState } from "@/content/live";
import { getWeather, placeFromHeaders } from "@/lib/weather";
import { getWorldState } from "@/lib/world-state";

/**
 * Embeds the live world data as JSON for the game to read at boot. The weather is the
 * visitor's own (by Vercel's IP location, else Oslo), so this renders per request, inside
 * the page's Suspense boundary; the title screen around it stays prerendered.
 */
export async function WorldStateScript() {
	const place = placeFromHeaders(await headers());
	const [world, weather] = await Promise.all([getWorldState(), getWeather(place)]);
	const state: WorldState = { ...world, weather };
	// Escape "<" so repo descriptions can never close the script tag.
	const json = JSON.stringify(state).replace(/</g, "\\u003c");
	return <script id={WORLD_STATE_ELEMENT_ID} type="application/json" dangerouslySetInnerHTML={{ __html: json }} />;
}
