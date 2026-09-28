// The sandbox's dialogue has no external functions and no link tags.
import type { DialogueHost } from "@datagutt/kai-assets/build/ink";

export const dialogueHost: DialogueHost = {
	externals: {},
	declarations: () => "",
	validIds: () => null,
	resolveLink: () => null,
};
