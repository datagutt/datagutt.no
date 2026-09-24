// Names of the conditions that open locked ways (docs/game/PLAN.md B6), for map `gate`
// objects and the `unlocked()` dialogue function. No imports, so the Node builds can
// check names without loading the game.
export const UNLOCK_IDS = ["passport"] as const;
export type UnlockId = (typeof UNLOCK_IDS)[number];
