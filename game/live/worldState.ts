// Reads the live data the page embeds (components/game/WorldStateScript.tsx). Anything
// missing or malformed falls back to empty data: the game must still boot, for example
// in the standalone dev harness or when GitHub was unreachable at render time.
import { EMPTY_WORLD_STATE, WORLD_STATE_ELEMENT_ID, type WorldState } from "../../content/live";

export function parseWorldState(json: string | null | undefined): WorldState {
	if (!json) return EMPTY_WORLD_STATE;
	try {
		const raw = JSON.parse(json) as Partial<WorldState>;
		return {
			repos: Array.isArray(raw.repos) ? raw.repos : [],
			stats: { ...EMPTY_WORLD_STATE.stats, ...(raw.stats ?? {}) },
			contributions: Array.isArray(raw.contributions) ? raw.contributions : [],
			fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : EMPTY_WORLD_STATE.fetchedAt,
		};
	} catch {
		return EMPTY_WORLD_STATE;
	}
}

export function readWorldState(doc: Document = document): WorldState {
	return parseWorldState(doc.getElementById(WORLD_STATE_ELEMENT_ID)?.textContent);
}
