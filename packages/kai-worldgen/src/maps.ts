import type { MapCanvas } from "./canvas.ts";

/**
 * A map a game generates. `outdoor` maps change with the seasons and the time of day.
 * A game's map module (kai.json `paths.maps`) exports `GENERATED_MAPS: GeneratedMap[]`, and
 * `MAP_OBJECTS: MapObjectType[]` (@datagutt/kai/world/objects) when its maps place object
 * types of the game's own or its plugins'.
 */
export type GeneratedMap = { id: string; properties?: Record<string, string>; outdoor?: boolean; build: () => MapCanvas };
