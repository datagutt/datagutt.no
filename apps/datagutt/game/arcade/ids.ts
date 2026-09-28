// The cabinets a map can place (the `arcade` map object's `game`). Kept apart from the
// games themselves, so the map build can check ids without loading any of them.
// Besides the youth club's five: Thomas's PC screensaver and the binoculars on the radio
// hill (docs/PLAN.md B2).
export const ARCADE_IDS = ["blocks", "life", "terrain", "dungeon", "starfield", "screensaver", "stargazing"] as const;
export type ArcadeId = (typeof ARCADE_IDS)[number];

export const isArcadeId = (id: string): id is ArcadeId => ARCADE_IDS.includes(id as ArcadeId);
