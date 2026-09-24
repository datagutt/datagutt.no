// The collections the engine itself reads. Every game has them; a game's own collections
// sit beside them (content/schema.ts in the game).
import type { Collections } from "./content.ts";

export const ENGINE_COLLECTIONS = {} satisfies Collections;
