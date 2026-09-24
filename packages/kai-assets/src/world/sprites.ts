// `sprite` map objects name strips from kai.json `sprites`: a name that isn't there, or a
// layer, season or time of day the game doesn't know, would only show up as a missing
// animation in the game.
import type { KaiConfig } from "@datagutt/kai/schema";
import { SPRITE_LAYERS, spriteObject, type AnyMapObject } from "@datagutt/kai/world/objects";
import { SEASONS } from "@datagutt/kai/world/season";

export function spriteProblems(mapId: string, objects: readonly AnyMapObject[], sprites: KaiConfig["sprites"]): string[] {
	const problems: string[] = [];
	for (const obj of objects) {
		if (!spriteObject.is(obj)) continue;
		const at = `${mapId}: sprite "${obj.sprite}" at (${obj.x}, ${obj.y})`;
		if (!(obj.sprite in sprites)) problems.push(`${at} is not in kai.json sprites`);
		for (const season of obj.seasons?.split(",") ?? []) {
			if (!(SEASONS as readonly string[]).includes(season)) problems.push(`${at} has season "${season}"; use ${SEASONS.join(", ")}`);
		}
		if (obj.when !== undefined && obj.when !== "day" && obj.when !== "night") problems.push(`${at} has when "${obj.when}"; use day or night`);
		if (obj.layer !== undefined && !(SPRITE_LAYERS as readonly string[]).includes(obj.layer)) problems.push(`${at} has layer "${obj.layer}"; use ${SPRITE_LAYERS.join(" or ")}, or none`);
	}
	return problems;
}
