// Fjord Town: the kai engine with this game's config, content, dialogue functions and
// plugins. The site's game shell and the dev harness both start it here.
import { createGame, type BootOptions, type GameHandle } from "@datagutt/kai";
import type { KaiConfig } from "@datagutt/kai/schema";
import { readWorldState } from "@datagutt/kai-live";
import config from "../.kai/config.json" with { type: "json" };
import { EMPTY_WORLD_STATE } from "../content/live";
import { fjordContent } from "./data";
import { fjordExternals } from "./dialogue/externals";
import { resolveLink } from "./dialogue/links";
import { arcadePlugin } from "./plugins/arcade";
import { catPlugin } from "./plugins/cat";
import { ferryIntroPlugin } from "./plugins/ferryIntro";
import { finalePlugin } from "./plugins/finale";
import { githubPlugin } from "./plugins/github";
import { journalPlugin } from "./plugins/journal";
import { presencePlugin } from "./plugins/presence";

export type { GameHandle };

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
		plugins: [catPlugin(), arcadePlugin(), githubPlugin(world), ferryIntroPlugin(), finalePlugin(), presencePlugin(world), journalPlugin()],
		externals: ({ progress, services }) =>
			fjordExternals({ world, hasStamp: (place) => progress.hasStamp(place), isUnlocked: (name) => services.data.isUnlocked(name, progress) }),
	});
}
