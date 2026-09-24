// What each unlock needs (game/progress/unlockIds.ts names them). One passport for now;
// later quests add their own condition here and a `gate` on a map.
import { STAMP_PLACES } from "./passport";
import { isUnlockId, type UnlockId } from "./unlockIds";

type Story = { stamps: readonly string[]; flags: Readonly<Record<string, boolean>> };

const CONDITIONS: Record<UnlockId, (story: Story) => boolean> = {
	/** Every stamp in the Fjord Passport: the mountain trail's rockfall is cleared. */
	passport: (story) => STAMP_PLACES.every((p) => story.stamps.includes(p.id)),
};

/** Whether `id` holds. Map objects name unlocks as strings; the asset build checks them. */
export const isUnlocked = (id: UnlockId | string, story: Story): boolean => isUnlockId(id) && CONDITIONS[id](story);
