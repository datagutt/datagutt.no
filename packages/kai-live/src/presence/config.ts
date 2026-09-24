// A live NPC's configuration (a game's content/presence.json): where they can be, how
// their Discord presence picks the place, and the words for it. The content build checks
// it with this schema; the runtime only reads the PresenceConfig type.
import { z } from "@datagutt/kai/schema";
import { EMOTES } from "@datagutt/kai/ui/emotes";

const text = z.string().min(1);
const emote = z.enum(Object.keys(EMOTES) as [keyof typeof EMOTES, ...(keyof typeof EMOTES)[]]);

const presence = z.object({
	status: z.enum(["online", "idle", "dnd", "offline"]),
	customStatus: z.string().nullable(),
	spotify: z.object({ song: z.string(), artist: z.string() }).nullable(),
	activities: z.array(
		z.object({
			kind: z.enum(["playing", "streaming", "listening", "watching", "custom", "competing"]),
			name: z.string(),
			details: z.string().nullable(),
			state: z.string().nullable(),
		}),
	),
});

/**
 * What a presence can be, for the rules: none yet, offline, writing code (an app that
 * matches `coding`), playing or streaming, listening to music, away, or anything else
 * online.
 */
export const PRESENCE_CASES = ["none", "offline", "coding", "playing", "music", "idle", "online"] as const;

export const presenceConfig = z
	.object({
		/** The live NPC's id: their character, their own Ink knot, and their spots (`<npc>-<place>`). */
		npc: text,
		/** The knot for talking to them while they are asleep; talking wakes them. */
		asleepKnot: text,
		/** Places they can be, each with its map and how the status page says it. */
		places: z.record(text, z.object({ map: text, where: text })),
		/** Maps they walk between, by the maps each has a door to. */
		routes: z.record(text, z.array(text)),
		/** Apps that mean writing code, as a case-insensitive regular expression over the app's name. */
		coding: z.string().refine((source) => {
			try {
				new RegExp(source, "i");
				return true;
			} catch {
				return false;
			}
		}, "not a regular expression"),
		/** The first rule whose case matches picks where they are and how they look. */
		rules: z
			.array(
				z.object({
					when: z.enum(PRESENCE_CASES),
					place: text,
					emote: emote.nullable().default(null),
					/** Lying in bed instead of standing. */
					asleep: z.boolean().default(false),
					/** Walks about near the place instead of standing still. */
					wanders: z.boolean().default(false),
					/** Keeps their custom status to themselves. */
					quiet: z.boolean().default(false),
				}),
			)
			.min(1),
		/** What they say they are up to (the `lanyard_activity` dialogue function). */
		lines: z.object({ codingDetails: text, coding: text, streaming: text, playing: text, music: text }),
		/** The start menu's status page. */
		status: z.object({
			none: text,
			discord: text,
			names: z.object({ online: text, idle: text, dnd: text, offline: text }),
			listening: text,
			listeningBy: text,
		}),
		/** Where they wait on a story night, whatever their presence, and what they say. */
		night: z.object({ place: text, dialogue: text }).optional(),
		/** Earned for waking them. */
		wakeGrants: text.optional(),
		/** Stand-in presences for `?debug&presence=<name>` and tests. */
		mocks: z.record(text, presence).default({}),
	})
	.superRefine((config, ctx) => {
		const places = Object.keys(config.places);
		config.rules.forEach((rule, i) => {
			if (!places.includes(rule.place)) ctx.addIssue({ code: "custom", path: ["rules", i, "place"], message: `no place "${rule.place}" in places` });
		});
		if (config.night && !places.includes(config.night.place)) ctx.addIssue({ code: "custom", path: ["night", "place"], message: `no place "${config.night.place}" in places` });
		if (!config.rules.some((r) => r.when === "none")) ctx.addIssue({ code: "custom", path: ["rules"], message: 'needs a rule for "none" (no presence yet)' });
	});

export type PresenceConfig = z.output<typeof presenceConfig>;
export type PresenceRule = PresenceConfig["rules"][number];
