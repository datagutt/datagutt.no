// Whether an unlock holds, from its condition in content/unlocks.json. The passport's
// unlock (every stamp) clears the mountain trail's rockfall.
import { content } from "../../content/index.ts";
import { STAMP_PLACES } from "./passport";
import type { UnlockId } from "./unlockIds";

type Story = { stamps: readonly string[]; flags: Readonly<Record<string, boolean>> };

/** Whether `id` holds. Map objects name unlocks as strings; the asset build checks them. */
export function isUnlocked(id: UnlockId, story: Story): boolean {
	const condition = content.unlocks[id];
	if (!condition) return false;
	return condition.stamps === "all" && STAMP_PLACES.every((p) => story.stamps.includes(p.id));
}
