// Fjord Town's dialogue functions and link tags as the asset build checks them
// (kai.json `paths.dialogueHost`).
import type { DialogueHost } from "@datagutt/kai-assets/build/ink";
import { EXTERNALS, externalDeclarations, validIds, type ArgKind } from "./externals.ts";
import { resolveLink } from "./links.ts";

export const dialogueHost: DialogueHost = {
	externals: EXTERNALS,
	declarations: externalDeclarations,
	validIds: (arg) => validIds(arg as ArgKind),
	resolveLink,
};
