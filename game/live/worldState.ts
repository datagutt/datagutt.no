// Reads the live data the page embeds (components/game/WorldStateScript.tsx). Anything
// missing or malformed falls back to empty data: the game must still boot, for example
// in the standalone dev harness or when GitHub was unreachable at render time.
import { CALM_WEATHER, EMPTY_WORLD_STATE, isWeatherKind, WORLD_STATE_ELEMENT_ID, type WeatherNow, type WorldState } from "../../content/live";

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function parseWeather(raw: Partial<WeatherNow> | undefined): WeatherNow {
	if (!raw || !isWeatherKind(raw.kind)) return CALM_WEATHER;
	return {
		kind: raw.kind,
		wind: finite(raw.wind) ? Math.max(0, raw.wind) : 0,
		windFrom: finite(raw.windFrom) ? raw.windFrom : 0,
		temperature: finite(raw.temperature) ? raw.temperature : null,
		symbol: typeof raw.symbol === "string" ? raw.symbol : "",
		live: raw.live === true,
	};
}

export function parseWorldState(json: string | null | undefined): WorldState {
	if (!json) return EMPTY_WORLD_STATE;
	try {
		const raw = JSON.parse(json) as Partial<WorldState>;
		return {
			repos: Array.isArray(raw.repos) ? raw.repos : [],
			stats: { ...EMPTY_WORLD_STATE.stats, ...(raw.stats ?? {}) },
			contributions: Array.isArray(raw.contributions) ? raw.contributions : [],
			// A Discord id is a snowflake: digits only.
			discordId: typeof raw.discordId === "string" && /^\d+$/.test(raw.discordId) ? raw.discordId : EMPTY_WORLD_STATE.discordId,
			weather: parseWeather(raw.weather),
			fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : EMPTY_WORLD_STATE.fetchedAt,
		};
	} catch {
		return EMPTY_WORLD_STATE;
	}
}

export function readWorldState(doc: Document = document): WorldState {
	return parseWorldState(doc.getElementById(WORLD_STATE_ELEMENT_ID)?.textContent);
}
