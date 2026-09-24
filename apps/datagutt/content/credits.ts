// The credits (content/credits.json): the START menu's Credits page and the finale's roll
// both read them.
import { content } from "./index.ts";

export type CreditSection = (typeof content.credits.sections)[number];

export const credits = content.credits;
