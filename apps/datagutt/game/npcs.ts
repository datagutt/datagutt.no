// Who lives in Fjord Town (content/npcs.json). Each NPC's look is the character of the
// same id (content/characters.json); their dialogue is the Ink knot of that id.
import { content } from "../content/index.ts";

type Roster = typeof content.npcs;
export type Npc = Roster[string] & { id: string };

export const NPCS: Npc[] = Object.entries(content.npcs).map(([id, npc]) => ({ id, ...npc }));

export function npc(id: string): Npc | undefined {
	return NPCS.find((n) => n.id === id);
}
