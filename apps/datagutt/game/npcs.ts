// Who lives in Fjord Town (docs/game/PLAN.md M2.8). Draft for the user to review: names,
// personalities and looks are all up for change. Each NPC's sprite recipe lives in
// game/assets/manifest.ts under the same id; their dialogue is the Ink knot of that id.

import type { Voice } from "./audio/blips";

export type Npc = {
	id: string;
	name: string;
	/** Place id from content/places.ts, or "town" for townsfolk who wander. */
	place: string;
	/** One line for the writer: how they talk and what they care about. */
	personality: string;
	/** What they present (mirrors content/places.ts), or null for townsfolk. */
	presents: string | null;
	voice: Voice;
};

export const NPCS: Npc[] = [
	{
		id: "ferryman",
		name: "Arne",
		place: "dock",
		personality: "Gruff, dry, secretly delighted to see anyone. Has rowed the 'ferry' for thirty years; the engine is for show.",
		presents: "Welcome, controls, the Journal",
		voice: { wave: "triangle", pitch: 190, variance: 0.05, volume: 0.09, every: 3 },
	},
	{
		id: "datagutt",
		name: "Thomas",
		place: "home",
		personality: "You. Friendly, a bit self-deprecating, excited about side projects. Live: where he is depends on Lanyard.",
		presents: "Hero, About, the portfolio model",
		voice: { wave: "square", pitch: 520, variance: 0.08, volume: 0.045, every: 2 },
	},
	{
		id: "streamer",
		name: "Sunniva",
		place: "boathouse",
		personality: "High-energy streamer who runs the boathouse studio. Talks in chat-speak, proud of low latency.",
		presents: "Guac.tv",
		voice: { wave: "square", pitch: 660, variance: 0.12, volume: 0.04, every: 2 },
	},
	{
		id: "technician",
		name: "Kjell",
		place: "radio-tower",
		personality: "Calm field engineer who judges everything by signal bars. Loves explaining bonding with rope metaphors.",
		presents: "IRLServer",
		voice: { wave: "sawtooth", pitch: 240, variance: 0.04, volume: 0.035, every: 3 },
	},
	{
		id: "shopkeeper",
		name: "Randi",
		place: "kiosk",
		personality: "Cheerful kiosk owner, tip-jar evangelist, pays for everything with Vipps and tells you so.",
		presents: "Donate.chat",
		voice: { wave: "triangle", pitch: 480, variance: 0.1, volume: 0.07, every: 2 },
	},
	{
		id: "coworker",
		name: "Ida",
		place: "office",
		personality: "Thomas's colleague at Nettbureau. Pragmatic, dry, lightly teases him about his side projects.",
		presents: "Nettbureau",
		voice: { wave: "square", pitch: 560, variance: 0.06, volume: 0.04, every: 2 },
	},
	{
		id: "sysadmin",
		name: "Bjørn",
		place: "town-hall",
		personality: "Retired municipal sysadmin in the town hall basement. War stories about Active Directory and a server named after his dog.",
		presents: "Indre Østfold Data IKS",
		voice: { wave: "sawtooth", pitch: 170, variance: 0.03, volume: 0.035, every: 3 },
	},
	{
		id: "trainer",
		name: "Tor",
		place: "gym",
		personality: "Friendly gym bro who runs the gym in the old log cabin. Treats the tech stack as weights: one rack per skill category, and he lifts all of it. Encouraging, a little too loud.",
		presents: "Tech stack",
		voice: { wave: "triangle", pitch: 150, variance: 0.04, volume: 0.1, every: 3 },
	},
	{
		id: "librarian",
		name: "Solveig",
		place: "library",
		personality: "Soft-spoken librarian who thinks every book should be free to borrow forever. Whispers.",
		presents: "Open source (live pinned repos)",
		voice: { wave: "sine", pitch: 620, variance: 0.05, volume: 0.07, every: 2 },
	},
	{
		id: "farmer",
		name: "Ola",
		place: "farm",
		personality: "Farmer who grows commits: every tile is a day, taller crops mean more code. Reads the stats like a weather report.",
		presents: "GitHub stats and contributions (live)",
		voice: { wave: "triangle", pitch: 210, variance: 0.07, volume: 0.09, every: 2 },
	},
	{
		id: "postmaster",
		name: "Liv",
		place: "post-office",
		personality: "Efficient postmaster. Will happily post your letter to Thomas and point you at every noticeboard link.",
		presents: "Contact and socials",
		voice: { wave: "square", pitch: 500, variance: 0.05, volume: 0.04, every: 2 },
	},
];

export function npc(id: string): Npc | undefined {
	return NPCS.find((n) => n.id === id);
}
