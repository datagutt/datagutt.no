// Fjord Town: the kai engine with this game's config, content, dialogue functions and
// plugins. The site's game shell and the dev harness both start it here.
import { createGame, type BootOptions, type GameHandle } from "@datagutt/kai";
import type { KaiConfig } from "@datagutt/kai/schema";
import { readWorldState } from "@datagutt/kai-live";
import { githubObjects } from "@datagutt/kai-live/github/plugin";
import { presenceNpc } from "@datagutt/kai-live/presence/plugin";
import config from "../.kai/config.json" with { type: "json" };
import { content } from "../content/index.ts";
import { EMPTY_WORLD_STATE } from "../content/live";
import { fjordContent } from "./data";
import { fjordExternals } from "./dialogue/externals";
import { resolveLink } from "./dialogue/links";
import { arcadePlugin } from "./plugins/arcade";
import { catPlugin } from "./plugins/cat";
import { ferryIntroPlugin } from "./plugins/ferryIntro";
import { finalePlugin } from "./plugins/finale";
import { journalPlugin } from "./plugins/journal";

export type { GameHandle };

/** On the finale's night Thomas waits on the pier with these words (content/presence.json). */
function finaleKnot(): string {
	const knot = content.presence.night?.dialogue;
	if (!knot) throw new Error("content/presence.json has no `night`: the finale needs Thomas on the pier");
	return knot;
}

export function startFjordTown(parent: HTMLElement, options: Omit<BootOptions, "config" | "content" | "live" | "links" | "plugins" | "externals"> = {}): GameHandle {
	// The live data the page embedded (GitHub, the weather), or empty data in the dev harness.
	const world = readWorldState(EMPTY_WORLD_STATE);
	return createGame(parent, {
		...options,
		config: config as KaiConfig,
		content: fjordContent,
		live: world,
		links: resolveLink,
		// In the order their start menu items appear: the status page, then the Journal.
		plugins: [
			catPlugin(),
			arcadePlugin(),
			githubObjects(world),
			ferryIntroPlugin(),
			finalePlugin({ knot: finaleKnot() }),
			presenceNpc(content.presence, { discordId: world.discordId }),
			journalPlugin(),
		],
		externals: ({ progress, services }) =>
			fjordExternals({ world, hasStamp: (place) => progress.hasStamp(place), isUnlocked: (name) => services.data.isUnlocked(name, progress) }),
	});
}
