// What each unlock needs (game/progress/unlockIds.ts names them). One passport for now;
// later quests add their own condition here and a `gate` on a map.
import { STAMP_PLACES } from "./passport";
import type { UnlockId } from "./unlockIds";

type Story = { stamps: readonly string[]; flags: Readonly<Record<string, boolean>> };

const CONDITIONS: Record<UnlockId, (story: Story) => boolean> = {
	/** Every stamp in the Fjord Passport: the mountain trail's rockfall is cleared. */
	passport: (story) => STAMP_PLACES.every((p) => story.stamps.includes(p.id)),
};

export const isUnlocked = (id: UnlockId, story: Story): boolean => CONDITIONS[id](story);
