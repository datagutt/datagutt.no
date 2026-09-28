// Fjord Town's defaults for the live data (types in @datagutt/kai-live): its own Discord
// user, and Oslo (kai.json live.weather.fallback) when the visitor's place is unknown,
// the town being Oslo-ish.
import { emptyWorldState, weatherPlace } from "@datagutt/kai-live";
import { siteLive } from "../lib/kai";
import { profile } from "./profile";

const fallback = siteLive.weather.fallback;
export const FALLBACK_PLACE = weatherPlace(fallback.city, fallback.lat, fallback.lon);

export const EMPTY_WORLD_STATE = emptyWorldState({ discordId: profile.discordId, place: FALLBACK_PLACE.city });

export const CALM_WEATHER = EMPTY_WORLD_STATE.weather;
