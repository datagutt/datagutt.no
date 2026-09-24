// What the asset build produces, from content/characters.json and content/music.json. Read
// at build time by scripts/assets/build.mjs (through Node's type stripping, so only
// erasable TypeScript here) and at runtime by the game. Recipe paths are relative to
// limezu/characters/ in the art repository; check changes with `bun run characters:review`.
import { content } from "../../content/index.ts";

export type CharacterRecipe = (typeof content.characters)[string];
export type CharacterLayer = CharacterRecipe["layers"][number];

export const CHARACTERS: Record<string, CharacterRecipe> = content.characters;

/** A music track: a loop from the art repository, path relative to its music/ folder. */
export type MusicTrack = (typeof content.music.tracks)[string];

// Towball's Crossing: Deluxe! by Towball, CC BY 4.0 (credited in content/credits.json).
// The assets repo's music/towballs-crossing-deluxe/TRACKS.md says why these seven. The
// build cuts each to its exact loop and writes public/game/music/<id>.ogg and .mp3.
export const MUSIC: Record<string, MusicTrack> = content.music.tracks;

export type MusicId = string;

/** Where a built track loops, in seconds from the start of its file (assets.json `music`). */
export type MusicLoop = { loopStart: number; loopEnd: number };
