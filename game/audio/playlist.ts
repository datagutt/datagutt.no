// Which music plays where (docs/game/PLAN.md B4): the title and the credits have the main
// theme, each room its mood, and the town follows the clock and the season. Pure, so it can
// be tested; Music.ts plays and crossfades.
import type { MusicId } from "../assets/manifest";
import type { Phase } from "../world/dayNight";
import type { Season } from "../world/season";

export type Moment =
	| { scene: "title" }
	| { scene: "credits" }
	| { scene: "world"; map: string; outdoors: boolean; phase: Phase; season: Season; finale: boolean };

/** Every interior by mood: homes and shops, places of work, and the quiet library. */
export const ROOMS: Record<string, MusicId> = {
	house: "market",
	"house-up": "market",
	farmhouse: "market",
	kiosk: "market",
	boathouse: "market",
	"post-office": "market",
	gym: "market",
	"youth-club": "market",
	office: "taxOffice",
	"town-hall": "taxOffice",
	"town-hall-basement": "taxOffice",
	"radio-hut": "taxOffice",
	library: "boredom",
};

export function trackFor(moment: Moment): MusicId {
	if (moment.scene !== "world") return "welcome";
	if (!moment.outdoors) return ROOMS[moment.map] ?? "market";
	// Night wins over winter, so winter keeps a day and a night track like the rest of the year.
	if (moment.finale || moment.phase === "night") return "goodnight";
	return moment.season === "winter" ? "snowedIn" : "sunrise";
}
