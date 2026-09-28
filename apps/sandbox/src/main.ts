// Boots the sandbox straight into its world: `bun run dev` bundles this for the harness.
import { createGame } from "@datagutt/kai";
import type { KaiConfig } from "@datagutt/kai/schema";
import { calmWeather } from "@datagutt/kai/world/weather-kinds";
import config from "../.kai/config.json" with { type: "json" };
import { content } from "../content/index.ts";

const container = document.getElementById("game");
if (!container) throw new Error("#game container missing");

createGame(container, {
	config: config as KaiConfig,
	content: { ...content, places: content.places.list },
	live: { weather: calmWeather("Nowhere") },
	autoStart: true,
});
