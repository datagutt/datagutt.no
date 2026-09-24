import { describe, expect, it } from "vitest";
import { NPCS } from "../npcs";
import { CHARACTERS, type CharacterRecipe } from "./manifest";

const recipes: Record<string, CharacterRecipe> = CHARACTERS;

describe("character recipes", () => {
	it("give every NPC in the roster a sprite and a portrait", () => {
		for (const npc of NPCS) {
			expect(recipes[npc.id], npc.id).toBeDefined();
			expect(recipes[npc.id].portrait, npc.id).not.toBe(false);
		}
	});

	it("give no two NPCs the same look", () => {
		const looks = NPCS.map((npc) => JSON.stringify(recipes[npc.id].layers));
		expect(new Set(looks).size).toBe(looks.length);
	});
});
