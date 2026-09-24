// kai.json: a game's static configuration. The build validates it with this schema; the
// runtime only ever sees the plain, already validated object through the KaiConfig type.
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, digits and dashes");

/** A path inside the licensed art checkout, such as "limezu/ui/Modern_UI_Style_1.png". */
const artPath = z.string().min(1);

export const kaiConfigSchema = z.object({
	$schema: z.string().optional(),
	/** The game's id. Its art overrides live under `games/<id>/` in the art repository. */
	id,
	title: z.string().min(1),
	/** The IANA time zone the game's clock and seasons follow ("Europe/Oslo"). */
	timezone: z.string().refine((zone) => {
		try {
			new Intl.DateTimeFormat("en", { timeZone: zone });
			return true;
		} catch {
			return false;
		}
	}, "not an IANA time zone"),
	/** Where a new game starts: a place id from the game's places. */
	startPlace: id,
	/** The localStorage key the game saves under. Changing it loses every visitor's save. */
	saveKey: z.string().min(1),
	/** The localStorage key that switches other visitors off entirely when it is "1". */
	visitorsOffKey: z.string().min(1),
	/** The URL path the built assets are served from; the build writes them to public/ plus this. */
	basePath: z.string().regex(/^\/([a-z0-9-]+\/)*$/, 'a path such as "/game/"'),
	/** Modules and folders of the game that the build loads, relative to the game's folder. */
	paths: z.object({
		/** Exports `GENERATED_MAPS` (@datagutt/kai-worldgen/maps), and `MAP_OBJECTS` when the game has map object types of its own. */
		maps: z.string(),
		/** The folder holding main.ink. */
		ink: z.string(),
		/** Exports `dialogueHost` (@datagutt/kai-assets/build/ink). */
		dialogueHost: z.string(),
		/** The entry module `kai dev` bundles: boots the game into a #game element. */
		harness: z.string().optional(),
	}),
	assets: z.object({
		/** The private art repository on GitHub, as "owner/name". */
		repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'use "owner/name"'),
		branch: z.string().default("main"),
		/** A local checkout of `repo`, relative to the monorepo root. Used when present. */
		localPath: z.string(),
		/** The environment variable that holds a read-only token for cloning `repo`. */
		tokenEnv: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
		/** The art adapter module, resolved from the game ("@datagutt/kai-limezu/adapter"). */
		adapter: z.string(),
	}),
	ui: z.object({
		/** The dialogue box's nine-slice frame: a cut from a sheet. */
		frame: z.object({ file: artPath, x: z.int(), y: z.int(), width: z.int().positive(), height: z.int().positive() }),
		/** The emote bubble sheet. */
		emotes: artPath,
	}),
	/** Animated sprite strips copied to `ui/<name>.png`, with a grey stand-in for placeholder builds. */
	sprites: z
		.record(
			id,
			z.object({
				file: artPath,
				frameWidth: z.int().positive(),
				frameHeight: z.int().positive(),
				frames: z.int().positive(),
				/** The game plays it as a loop, texture and animation `sprite:<name>`, at this rate. */
				frameRate: z.number().positive().default(8),
			}),
		)
		.default({}),
	/** The in-game bitmap font, drawn from a web font in an npm package. */
	font: z.object({
		/** A module of the package, resolved from the app ("geist/font/pixel"). */
		module: z.string(),
		/** The font file, relative to the directory of `module`. */
		file: z.string(),
		/** Font units per game pixel. */
		unitsPerPixel: z.number().positive(),
	}),
	live: z
		.object({
			weather: z
				.object({
					/** Where the weather comes from when the visitor's place is unknown. */
					fallback: z.object({ city: z.string(), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
					/** MET Norway's terms require a User-Agent that names the site and a contact. */
					userAgent: z.string().min(1),
				})
				.optional(),
			github: z.object({ user: z.string().min(1) }).optional(),
		})
		.default({}),
});

export type KaiConfig = z.output<typeof kaiConfigSchema>;
/** kai.json as written, before the schema fills in defaults. */
export type KaiConfigInput = z.input<typeof kaiConfigSchema>;
