import { spawnObject } from "@datagutt/kai/world/objects";
import { describe, expect, it } from "vitest";
import { places, type Place } from "../../../content/places";
import { GENERATED_MAPS } from "./index";

describe("places on the maps", () => {
	it("gives every place an entrance, at a spawn that exists on its map", () => {
		const built = new Map(GENERATED_MAPS.map((m) => [m.id, m.build()]));
		for (const place of places as readonly Place[]) {
			expect(place.entrance, place.id).toBeDefined();
			const { map, spawn } = place.entrance!;
			const spawns = built.get(map)?.objects.filter((o) => spawnObject.is(o) && o.id === spawn) ?? [];
			expect(spawns, `${place.id}: spawn "${spawn}" on ${map}`).toHaveLength(1);
		}
	});
});
