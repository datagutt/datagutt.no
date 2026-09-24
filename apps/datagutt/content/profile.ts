// Who datagutt is. Single source for the game's dialogue and the Journal
// (docs/game/DESIGN.md §12). Keep facts here, not in components or Ink files.

export type QuickFact = { label: string; value: string };

export const profile = {
	name: "Thomas Lekanger",
	firstName: "Thomas",
	handle: "datagutt",
	role: "Full-stack developer",
	tagline: "Building live streaming tools, payment solutions, and weird side projects from Norway.",
	location: "Oslo, Norway",
	email: "mail@datagutt.no",
	avatar: "/images/avatar.png",
	/** Used for "years coding" in stats. */
	codingSince: 2010,
	about: [
		"I'm Thomas, a full-stack developer based in Norway. I enjoy building things for the web — from live streaming infrastructure and payment integrations to weird side projects that keep me up at night.",
		"Most of my work revolves around TypeScript, React, and Node.js, but I also dabble in Rust when performance matters. I care about shipping fast, writing clean code, and making products that people actually want to use.",
	],
	quickFacts: [
		{ label: "Location", value: "Oslo, Norway" },
		{ label: "Role", value: "Full-stack Developer" },
		{ label: "Focus", value: "Streaming & Payments" },
		{ label: "Side projects", value: "Always shipping" },
	] satisfies QuickFact[],
	contactPitch: "Got a project in mind, want to collaborate, or just want to say hi? My inbox is always open.",
	sourceCode: "https://github.com/datagutt/datagutt.no",
	/**
	 * Discord user whose Lanyard presence drives the live datagutt NPC. Lanyard only sees
	 * members of its Discord server. `NEXT_PUBLIC_DISCORD_ID` overrides it (lib/lanyard.ts).
	 */
	discordId: "132474831424716800",
} as const;
