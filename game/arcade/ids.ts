// The cabinets a map can place (the `arcade` map object's `game`). Kept apart from the
// games themselves, so the map build can check ids without loading any of them.
export const ARCADE_IDS = ["blocks", "life", "terrain", "dungeon", "starfield"] as const;
export type ArcadeId = (typeof ARCADE_IDS)[number];
