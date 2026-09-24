// Fjord Town's defaults for the live data (types in @datagutt/kai-live): its own Discord
// user, and Oslo when the visitor's place is unknown, the town being Oslo-ish.
import { emptyWorldState, weatherPlace } from "@datagutt/kai-live";
import { profile } from "./profile";

export const FALLBACK_PLACE = weatherPlace("Oslo", 59.9139, 10.7522);

export const EMPTY_WORLD_STATE = emptyWorldState({ discordId: profile.discordId, place: FALLBACK_PLACE.city });

export const CALM_WEATHER = EMPTY_WORLD_STATE.weather;
