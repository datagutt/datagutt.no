// Fjord Passport (docs/game/DESIGN.md §6): one stamp per place, earned by finishing a
// conversation with that place's main NPC. Nothing is gated; stamps reward curiosity and
// a full passport unlocks the finale (M5.8).
import { places, type Place } from "../../content/places";
import { NPCS } from "../npcs";

/** Places that give a stamp, in passport order. */
export const STAMP_PLACES: Place[] = places.filter((p) => p.stamp);

/** The place whose stamp an NPC gives, if they are that place's main NPC. */
export function stampForNpc(npcId: string): string | null {
	const place = NPCS.find((n) => n.id === npcId)?.place;
	return place && STAMP_PLACES.some((p) => p.id === place) ? place : null;
}

export type StampResult = { stamps: string[]; newStamp: string | null; complete: boolean };

/** Add a stamp if it is new. Unknown place ids are ignored. */
export function awardStamp(stamps: readonly string[], place: string | null): StampResult {
	const known = new Set(STAMP_PLACES.map((p) => p.id));
	const current = stamps.filter((s) => known.has(s));
	if (!place || !known.has(place) || current.includes(place)) {
		return { stamps: current, newStamp: null, complete: current.length === known.size };
	}
	const next = [...current, place];
	return { stamps: next, newStamp: place, complete: next.length === known.size };
}
