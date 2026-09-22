export type Social = { id: string; label: string; url: string };

/** In display order. */
export const socials: Social[] = [
	{ id: "x", label: "X", url: "https://x.com/datagutt" },
	{ id: "bluesky", label: "Bluesky", url: "https://bsky.app/profile/datagutt.no" },
	// Discord is left out until there is an invite link (it was commented out on the old site).
	{ id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/thomas-lekanger-a77990b0/" },
	{ id: "instagram", label: "Instagram", url: "https://instagram.com/lekanger" },
	{ id: "github", label: "GitHub", url: "https://github.com/datagutt" },
	{ id: "twitch", label: "Twitch", url: "https://twitch.tv/datagutt" },
];

export function social(id: string): Social {
	const found = socials.find((s) => s.id === id);
	if (!found) throw new Error(`Unknown social "${id}"`);
	return found;
}
