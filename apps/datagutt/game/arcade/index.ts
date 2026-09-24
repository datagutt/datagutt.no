// Fjord Town's cabinets by the id a map gives them (./ids.ts): the kai-arcade games, plus
// two variants. Thomas's PC runs Life as a screensaver, and the binoculars on the radio
// hill show the starfield's sky alone.
import { BUILTIN_GAMES, Life, Starfield, type ArcadeFactory, type ArcadeGame, type Records } from "@datagutt/kai-arcade";
import type { ArcadeId } from "./ids";

const GAMES: Record<ArcadeId, ArcadeFactory> = {
	...BUILTIN_GAMES,
	screensaver: () => new Life(Date.now(), false),
	stargazing: () => new Starfield(Date.now(), true),
};

export type { Records };

export function makeArcade(id: ArcadeId, records: Records): ArcadeGame {
	return GAMES[id](records);
}
