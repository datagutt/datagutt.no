// Builds a cabinet's game by the id a map gives it (game/arcade/ids.ts).
import { FallingBlocks } from "./blocks";
import { Dungeon } from "./dungeon";
import type { ArcadeId } from "./ids";
import { Life } from "./life";
import { Starfield } from "./starfield";
import { Terrain } from "./terrain";
import type { ArcadeGame } from "./types";

export type Records = { best: (name: string) => number; record: (name: string, score: number) => void };

export function makeArcade(id: ArcadeId, records: Records): ArcadeGame {
	switch (id) {
		case "blocks":
			return new FallingBlocks(records.best("blocks"), (score) => records.record("blocks", score));
		case "life":
			return new Life();
		case "terrain":
			return new Terrain();
		case "dungeon":
			return new Dungeon();
		case "starfield":
			return new Starfield();
	}
}
