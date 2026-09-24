import { content } from "./index.ts";

export type SkillCategory = (typeof content.skills.categories)[number];

/** content/skills.json */
export const skillCategories: SkillCategory[] = content.skills.categories;
