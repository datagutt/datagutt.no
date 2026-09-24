// A game's content as the runtime reads it: the engine's collections (the content build
// checked them) and the structural part of the game's places, with the rules that follow
// from them: who gives which stamp, what an unlock needs, which track plays where.
import type { ContentOf } from "./schema/content.ts";
import type { ENGINE_COLLECTIONS } from "./schema/engine.ts";
import { format, withDefaults, type StringKey, type Strings } from "./ui/strings.ts";
import type { Season } from "./world/season.ts";

export type EngineContent = ContentOf<typeof ENGINE_COLLECTIONS>;
export type Npc = EngineContent["npcs"][string] & { id: string };
export type Voice = Npc["voice"];
export type Achievement = EngineContent["achievements"]["list"][number];
export type CharacterRecipe = EngineContent["characters"][string];

/** What the runtime needs of a place: the game's places may carry more. */
export type PlaceInfo = { id: string; name: string; stamp: boolean; entrance?: { map: string; spawn: string } };

export type GameContent = EngineContent & { places: readonly PlaceInfo[] };

export type StampResult = { stamps: string[]; newStamp: string | null; complete: boolean };

/** Where music is wanted: the title, the credits, or the world at some moment. */
export type Moment =
	| { scene: "title" }
	| { scene: "credits" }
	| { scene: "world"; map: string; outdoors: boolean; phase: "dawn" | "day" | "dusk" | "night"; season: Season; night: boolean };

/** Voice for someone with no voice of their own. */
export const DEFAULT_VOICE: Voice = { wave: "square", pitch: 440, variance: 0.06, volume: 0.05, every: 2 };

export const achievementFlag = (id: string) => `achievement:${id}`;

export class GameData {
	readonly npcs: readonly Npc[];
	/** Places that give a stamp, in passport order. */
	readonly stampPlaces: readonly PlaceInfo[];
	private readonly strings: Strings;

	constructor(readonly content: GameContent) {
		this.npcs = Object.entries(content.npcs).map(([id, npc]) => ({ id, ...npc }));
		this.stampPlaces = content.places.filter((p) => p.stamp);
		this.strings = withDefaults(content.strings);
	}

	/** A UI text by key, with its `{name}` values filled in. */
	t(key: StringKey, vars?: Record<string, string | number>): string {
		return vars ? format(this.strings[key], vars) : this.strings[key];
	}

	npc(id: string): Npc | undefined {
		return this.npcs.find((n) => n.id === id);
	}

	/** A character's voice from the cast, or the default. */
	voiceFor(character: string | null): Voice {
		return (character && this.npc(character)?.voice) || DEFAULT_VOICE;
	}

	get achievements(): readonly Achievement[] {
		return this.content.achievements.list;
	}

	achievement(id: string): Achievement {
		const found = this.achievements.find((a) => a.id === id);
		if (!found) throw new Error(`Unknown achievement "${id}"`);
		return found;
	}

	place(id: string): PlaceInfo {
		const found = this.content.places.find((p) => p.id === id);
		if (!found) throw new Error(`Unknown place "${id}"`);
		return found;
	}

	/** The place named by `?at=` in a URL search string, if it is known and has an entrance. */
	placeFromSearch(search: string): PlaceInfo | null {
		const at = new URLSearchParams(search).get("at")?.trim().toLowerCase();
		const found = at ? this.content.places.find((p) => p.id === at) : undefined;
		return found?.entrance ? found : null;
	}

	placeName(id: string): string {
		return this.stampPlaces.find((p) => p.id === id)?.name ?? id;
	}

	/** The place whose stamp an NPC gives, if they are that place's main NPC. */
	stampForNpc(npcId: string): string | null {
		const place = this.npc(npcId)?.place;
		return place && this.stampPlaces.some((p) => p.id === place) ? place : null;
	}

	/** Add a stamp if it is new. Unknown place ids are ignored, and dropped from `stamps`. */
	awardStamp(stamps: readonly string[], place: string | null): StampResult {
		const known = new Set(this.stampPlaces.map((p) => p.id));
		const current = stamps.filter((s) => known.has(s));
		if (!place || !known.has(place) || current.includes(place)) {
			return { stamps: current, newStamp: null, complete: current.length === known.size };
		}
		const next = [...current, place];
		return { stamps: next, newStamp: place, complete: next.length === known.size };
	}

	/** Every stamp is in. */
	passportFull(progress: { hasStamp(place: string): boolean }): boolean {
		return this.stampPlaces.every((p) => progress.hasStamp(p.id));
	}

	/** Whether an unlock (content/unlocks.json) holds for the player's stamps. */
	isUnlocked(id: string, progress: { hasStamp(place: string): boolean }): boolean {
		const condition = this.content.unlocks[id];
		return condition?.stamps === "all" && this.passportFull(progress);
	}

	/** The track for a moment, by the playlist (content/music.json). */
	trackFor(moment: Moment): string {
		const playlist = this.content.music.playlist;
		if (moment.scene === "title") return playlist.title;
		if (moment.scene === "credits") return playlist.credits;
		if (!moment.outdoors) return playlist.indoors.maps[moment.map] ?? playlist.indoors.default;
		// Night wins over winter, so winter keeps a day and a night track like the rest of the year.
		if (moment.night || moment.phase === "night") return playlist.outdoors.night;
		return moment.season === "winter" ? playlist.outdoors.winter : playlist.outdoors.day;
	}
}
