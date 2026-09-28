// Who datagutt is (content/profile.json). Single source for the game's dialogue and the
// Journal (docs/DESIGN.md §12). Keep facts there, not in components or Ink files.
import { content } from "./index.ts";

export type Profile = typeof content.profile;
export type QuickFact = Profile["quickFacts"][number];

export const profile = content.profile;
