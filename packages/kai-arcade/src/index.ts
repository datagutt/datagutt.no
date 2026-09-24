export { FallingBlocks } from "./blocks.ts";
export { Dungeon } from "./dungeon.ts";
export { Life } from "./life.ts";
export { Starfield } from "./starfield.ts";
export { Terrain } from "./terrain.ts";
export * from "./types.ts";

import { FallingBlocks } from "./blocks.ts";
import { Dungeon } from "./dungeon.ts";
import { Life } from "./life.ts";
import { Starfield } from "./starfield.ts";
import { Terrain } from "./terrain.ts";
import type { ArcadeGame } from "./types.ts";

/** Best scores, shared by every cabinet that plays the same game. */
export type Records = { best: (name: string) => number; record: (name: string, score: number) => void };

/** Builds a fresh game for a cabinet. A game registry maps cabinet ids to these. */
export type ArcadeFactory = (records: Records) => ArcadeGame;

/** The five cabinet games under their own names. A game can register variants beside them. */
export const BUILTIN_GAMES = {
	blocks: (records) => new FallingBlocks(records.best("blocks"), (score) => records.record("blocks", score)),
	life: () => new Life(),
	terrain: () => new Terrain(),
	dungeon: () => new Dungeon(),
	starfield: () => new Starfield(),
} satisfies Record<string, ArcadeFactory>;
