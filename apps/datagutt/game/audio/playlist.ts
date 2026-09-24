// Which music plays where (docs/game/PLAN.md B4): the title and the credits have the main
// theme, each room its mood, and the town follows the clock and the season. Pure, so it can
// be tested; Music.ts plays and crossfades.
import { content } from "../../content/index.ts";
import type { MusicId } from "../assets/manifest";
import type { Phase } from "../world/dayNight";
import type { Season } from "@datagutt/kai/world/season";

export type Moment =
	| { scene: "title" }
	| { scene: "credits" }
	| { scene: "world"; map: string; outdoors: boolean; phase: Phase; season: Season; night: boolean };

/** content/music.json `playlist`: the title and credits tracks, the town's, and each room's mood. */
const PLAYLIST = content.music.playlist;

export function trackFor(moment: Moment): MusicId {
	if (moment.scene === "title") return PLAYLIST.title;
	if (moment.scene === "credits") return PLAYLIST.credits;
	if (!moment.outdoors) return PLAYLIST.indoors.maps[moment.map] ?? PLAYLIST.indoors.default;
	// Night wins over winter, so winter keeps a day and a night track like the rest of the year.
	if (moment.night || moment.phase === "night") return PLAYLIST.outdoors.night;
	return moment.season === "winter" ? PLAYLIST.outdoors.winter : PLAYLIST.outdoors.day;
}
