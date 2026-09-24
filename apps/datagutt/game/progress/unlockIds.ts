// Names of the conditions that open locked ways (content/unlocks.json), for map `gate`
// objects and the `unlocked()` dialogue function.
import { content } from "../../content/index.ts";

export type UnlockId = string;

export const UNLOCK_IDS: UnlockId[] = Object.keys(content.unlocks);

export const isUnlockId = (id: string): id is UnlockId => UNLOCK_IDS.includes(id);
