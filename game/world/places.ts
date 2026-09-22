// Named places for `?at=` deep links (docs/game/PLAN.md M1.11): each spawns the player
// outside that place. Moves to content/places.ts with the content module in M2.1.

export type Place = { map: string; spawn: string };

export const PLACES = {
	dock: { map: "town", spawn: "ferry" },
	home: { map: "town", spawn: "house_door" },
	office: { map: "town", spawn: "office_door" },
} as const satisfies Record<string, Place>;

export type PlaceId = keyof typeof PLACES;

export const START_PLACE: PlaceId = "dock";

/** The place named by `?at=` in a URL search string, if it is a known place. */
export function placeFromSearch(search: string): PlaceId | null {
	const at = new URLSearchParams(search).get("at")?.trim().toLowerCase();
	return at && Object.hasOwn(PLACES, at) ? (at as PlaceId) : null;
}
