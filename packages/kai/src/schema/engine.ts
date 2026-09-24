// The collections the engine itself reads. Every game has them; a game's own collections
// sit beside them (content/schema.ts in the game).
import { z } from "zod";
import { json, type Collections } from "./content.ts";

const id = z.string().regex(/^[a-zA-Z0-9_-]+$/, "use letters, digits, dashes and underscores");
const text = z.string().min(1);
const hex = z.string().regex(/^[0-9a-f]{6}([0-9a-f]{2})?$/, "use rrggbb or rrggbbaa, lowercase");

/**
 * A character generator layer, relative to the art adapter's characters folder, or one
 * that names the portrait layer to use instead of the derived one (such as a hat's
 * `_Small` variant, which sits on the portrait head better).
 */
const characterLayer = z.union([text, z.object({ file: text, portrait: text })]);

export const characterRecipe = z.object({
	/** What the look says, for whoever edits it next. */
	description: z.string().optional(),
	/** Layers in the generator's stacking order: body, eyes, outfit, hair, then accessories. */
	layers: z.array(characterLayer).min(1),
	/** Exact colour swaps (rrggbb to rrggbb) applied to every layer, for custom hair and the like. */
	recolor: z.record(hex, hex).optional(),
	/** Main colour of the stand-in sprite drawn in placeholder builds. */
	placeholder: hex,
	/**
	 * Portrait layers, relative to the art adapter's portraits folder. Leave it out to
	 * derive the portrait from `layers`; `false` for none. `recolor` applies here too.
	 */
	portrait: z.union([z.array(text), z.literal(false)]).optional(),
});

/** How an NPC's text sounds as it types out: a short synthesised blip per letter. */
export const voice = z.object({
	wave: z.enum(["sine", "square", "sawtooth", "triangle"]),
	/** Base pitch in Hz. */
	pitch: z.number().positive(),
	/** Random pitch spread, as a fraction of the base (0.1 = ±10%). */
	variance: z.number().min(0).max(1),
	volume: z.number().min(0).max(1),
	/** Blip on every n-th letter. */
	every: z.int().positive(),
});

export const npc = z.object({
	name: text,
	/** Where they belong: a place id, or a looser word such as "town" for those who wander. */
	place: text.optional(),
	/** One line for the writer: how they talk and what they care about. */
	personality: z.string().optional(),
	/** What they tell visitors about, for the writer. */
	presents: z.string().optional(),
	voice,
});

const playlist = z.object({
	/** The title screen's track. */
	title: id,
	credits: id,
	outdoors: z.object({ day: id, night: id, winter: id }),
	/** Interiors by map id, and the track for any interior not listed. */
	indoors: z.object({ default: id, maps: z.record(id, id).default({}) }),
});

export const music = z
	.object({
		/** Loops from the art repository, relative to its music/ folder. */
		tracks: z.record(id, z.object({ file: text })),
		playlist,
	})
	.superRefine(({ tracks, playlist }, ctx) => {
		const used = [
			["playlist", "title", playlist.title],
			["playlist", "credits", playlist.credits],
			...Object.entries(playlist.outdoors).map(([k, v]) => ["playlist", "outdoors", k, v]),
			["playlist", "indoors", "default", playlist.indoors.default],
			...Object.entries(playlist.indoors.maps).map(([k, v]) => ["playlist", "indoors", "maps", k, v]),
		];
		for (const path of used) {
			const track = path.at(-1)!;
			if (!(track in tracks)) ctx.addIssue({ code: "custom", path: path.slice(0, -1), message: `no track "${track}" in tracks` });
		}
	});

export const achievement = z.object({
	id,
	name: text,
	/** Shown once earned; before that the passport shows "???". */
	how: text,
});

/** What opens an unlock: for now, every stamp there is. */
export const unlockCondition = z.object({ stamps: z.literal("all") });

export const credits = z.object({
	title: text,
	byline: text,
	sections: z.array(z.object({ heading: text, lines: z.array(z.string()) })),
	thanks: text,
});

export const ENGINE_COLLECTIONS = {
	/** Character looks by id: the player, every NPC and every extra. */
	characters: json(z.record(id, characterRecipe)),
	/** The cast by id, whose dialogue is the Ink knot of the same id. */
	npcs: json(z.record(id, npc)),
	music: json(music),
	/** In the order the passport lists them. */
	achievements: json(z.object({ list: z.array(achievement) })),
	/** Conditions that open locked ways (map `gate` and `door` objects) by id. */
	unlocks: json(z.record(id, unlockCondition).default({})),
	/** The credits page and the credits roll. */
	credits: json(credits),
} satisfies Collections;
