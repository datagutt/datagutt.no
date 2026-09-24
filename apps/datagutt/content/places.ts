// The town's places (content/places.json) and what each one presents (docs/DESIGN.md
// §5). Used for passport stamps, `?at=` deep links, the Journal's "visit in game" links
// and the validator that checks every piece of content has a home.

import config from "../kai.json" with { type: "json" };
import { content } from "./index.ts";

export type Place = (typeof content.places.list)[number];
export type ContentRef = Place["presents"][number];
export type PlaceId = string;

export const places: Place[] = content.places.list;

export const START_PLACE: PlaceId = config.startPlace;

export function place(id: PlaceId): Place {
	const found = places.find((p) => p.id === id);
	if (!found) throw new Error(`Unknown place "${id}"`);
	return found;
}

/** The place named by `?at=` in a URL search string, if it is known and has an entrance. */
export function placeFromSearch(search: string): Place | null {
	const at = new URLSearchParams(search).get("at")?.trim().toLowerCase();
	const found = at ? places.find((p) => p.id === at) : undefined;
	return found?.entrance ? found : null;
}

/** The place that presents a piece of content (content.test.ts: each has exactly one). */
export function placePresenting(kind: ContentRef["kind"], id?: string): Place {
	const found = places.find((p) => p.presents.some((r) => r.kind === kind && (!("id" in r) || r.id === id)));
	if (!found) throw new Error(`No place presents ${kind}${id ? ` "${id}"` : ""}`);
	return found;
}
