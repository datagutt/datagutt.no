import { content } from "./index.ts";

export type Social = (typeof content.socials.links)[number];

/** In display order (content/socials.json). */
export const socials: Social[] = content.socials.links;

export function social(id: string): Social {
	const found = socials.find((s) => s.id === id);
	if (!found) throw new Error(`Unknown social "${id}"`);
	return found;
}
