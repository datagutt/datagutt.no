// The schemas of Fjord Town's own content collections, beside the engine's. `kai content`
// checks content/ against them; content/index.ts gives the compiled bundle their types.
import { ENGINE_COLLECTIONS, json, markdown, z, type ContentOf } from "@datagutt/kai/schema";
import { placeInfo } from "@datagutt/kai/schema/engine";
import { presenceConfig } from "@datagutt/kai-live/presence/config";

const text = z.string().min(1);
/** A path under public/, such as "/images/avatar.png". */
const publicPath = z.string().startsWith("/");

export const collections = {
	/** Who datagutt is: the one source for the game's dialogue and the Journal. */
	profile: json(
		z.object({
			name: text,
			firstName: text,
			handle: text,
			role: text,
			tagline: text,
			location: text,
			email: z.email(),
			avatar: publicPath,
			/** Used for "years coding" in stats. */
			codingSince: z.int(),
			about: z.array(text).min(1),
			quickFacts: z.array(z.object({ label: text, value: text })),
			contactPitch: text,
			sourceCode: z.url(),
			/**
			 * The Discord user whose Lanyard presence drives the live datagutt NPC. Lanyard only
			 * sees members of its Discord server. `NEXT_PUBLIC_DISCORD_ID` overrides it
			 * (lib/lanyard.ts).
			 */
			discordId: z.string().regex(/^\d+$/, "a Discord id is digits only"),
		}),
	),
	/** Social links, in display order. */
	socials: json(z.object({ links: z.array(z.object({ id: text, label: text, url: z.url() })) })),
	skills: json(z.object({ categories: z.array(z.object({ name: text, skills: z.array(text).min(1) })) })),
	/** Projects, one Markdown file each; dialogue refers to them by id, e.g. project_desc("irlserver"). */
	projects: markdown(
		z.object({
			id: text,
			name: text,
			description: text,
			image: publicPath,
			width: z.int().positive().optional(),
			height: z.int().positive().optional(),
			link: z.url().optional(),
			poweredBy: z
				.array(text)
				.optional()
				.transform((names) => names?.map((name) => ({ name }))),
		}),
		{ body: "description" },
	),
	/**
	 * The town's places and what each one presents (docs/DESIGN.md §5): passport
	 * stamps, `?at=` deep links, the Journal's "visit in game" links, and the check that
	 * every piece of content has a home.
	 */
	places: json(
		z.object({
			list: z.array(
				placeInfo.extend({
					/** The site's content this place shows in town. */
					presents: z.array(
						z.discriminatedUnion("kind", [
							z.object({ kind: z.enum(["profile", "skills", "repos", "stats", "contact"]) }),
							z.object({ kind: z.enum(["project", "experience"]), id: text }),
						]),
					),
				}),
			),
		}),
	),
	/**
	 * The words in the maps: each map's name, and the texts its builder places on signs
	 * and shut doors, by map id and key (world/gen/text.ts).
	 */
	mapText: json(z.object({ names: z.record(text, text), signs: z.record(text, z.record(text, text)) })),
	/** The live datagutt NPC: Thomas's Discord presence picks where he is (@datagutt/kai-live). */
	presence: json(presenceConfig),
	/** Jobs, one Markdown file each. */
	experience: markdown(z.object({ id: text, company: text, role: text, period: text, description: text, tech: z.array(text) }), {
		body: "description",
	}),
};

export type Content = ContentOf<typeof ENGINE_COLLECTIONS & typeof collections>;
