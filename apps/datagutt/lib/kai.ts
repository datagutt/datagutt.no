import type { KaiConfig } from "@datagutt/kai/schema";
import config from "../.kai/config.json" with { type: "json" };

// kai.json for code that runs in Next, as `kai content` validated it (defaults filled in).
export const kaiConfig = config as KaiConfig;

function required<T>(value: T | undefined, field: string): T {
	if (value === undefined) throw new Error(`kai.json needs \`${field}\`: the site fetches live data with it`);
	return value;
}

/** The live settings the site can't do without, which kai.json leaves optional for other games. */
export const siteLive = {
	weather: required(kaiConfig.live.weather, "live.weather"),
	github: required(kaiConfig.live.github, "live.github"),
};
