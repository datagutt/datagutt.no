// What the ambience should sound like where the player stands (docs/game/PLAN.md M5.6):
// a level from 0 to 1 for each layer, from how near the sea, the forest and a fire are,
// whether it's indoors, the time of day, the season and the weather. Pure, so it can be
// tested; the sounds themselves are in Ambience.ts.
import type { Season } from "@datagutt/kai/world/season";

export const LAYERS = ["waves", "wind", "gulls", "birds", "fire", "room", "rain", "thunder"] as const;
export type Layer = (typeof LAYERS)[number];
export type Mix = Record<Layer, number>;

export type Surroundings = {
	outdoors: boolean;
	/** Tiles to the nearest open water, forest cell and fire; Infinity when there is none. */
	water: number;
	forest: number;
	fire: number;
	/** How dark it is, 0 day to 1 night (world/dayNight.ts). */
	dark: number;
	season: Season;
	/** From world/weather.ts weatherSound; calm when left out. */
	weather?: { rain: number; wind: number; thunder: boolean };
};

const CALM = { rain: 0, wind: 0, thunder: false };

/** How far each sound carries, in tiles. */
const REACH = { water: 12, forest: 8, fire: 6 };

const near = (distance: number, reach: number) => Math.max(0, 1 - distance / reach);

export function ambienceMix(s: Surroundings): Mix {
	const day = 1 - s.dark;
	const weather = s.weather ?? CALM;
	const thunder = weather.thunder ? 1 : 0;
	if (!s.outdoors) {
		// Indoors: the hum of the room, a fire if there is one, the weather outside faintly.
		return {
			waves: 0,
			wind: 0.2 + 0.2 * weather.wind,
			gulls: 0,
			birds: 0,
			fire: near(s.fire, REACH.fire),
			room: 1,
			rain: weather.rain * 0.25,
			thunder: thunder * 0.5,
		};
	}
	const sea = near(s.water, REACH.water);
	const woods = near(s.forest, REACH.forest);
	const winter = s.season === "winter";
	// Birds and gulls keep their heads down in the rain.
	const shelter = 1 - 0.8 * weather.rain;
	return {
		waves: sea,
		wind: Math.min(1, (winter ? 0.7 : 0.4) + woods * 0.3 + weather.wind * 0.6),
		gulls: sea * day * (winter ? 0.3 : 1) * shelter,
		birds: woods * day * (winter ? 0.15 : s.season === "autumn" ? 0.6 : 1) * shelter,
		fire: 0,
		room: 0,
		rain: weather.rain,
		thunder,
	};
}
