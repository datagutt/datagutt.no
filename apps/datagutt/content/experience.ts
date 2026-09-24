import { content } from "./index.ts";

export type Experience = (typeof content.experience)[number];

/** content/experience/*.md */
export const experience: Experience[] = content.experience;
