// Fjord Town: the kai engine with this game's config, content, dialogue functions and
// plugins. The site's game shell and the dev harness both start it here.
import type { KaiConfig } from "@datagutt/kai/schema";
import config from "../.kai/config.json" with { type: "json" };
import { content } from "../content/index.ts";
import { bootGame, type BootOptions, type GameHandle } from "./boot";
import { fjordExternals } from "./dialogue/externals";
import { arcadePlugin } from "./plugins/arcade";
import { catPlugin } from "./plugins/cat";
import { ferryIntroPlugin } from "./plugins/ferryIntro";
import { finalePlugin } from "./plugins/finale";
import { githubPlugin } from "./plugins/github";
import { journalPlugin } from "./plugins/journal";
import { presencePlugin } from "./plugins/presence";
import { triggersPlugin } from "./plugins/triggers";
import { isUnlocked } from "./progress/unlocks";

export type { GameHandle };

export function startFjordTown(parent: HTMLElement, options: Omit<BootOptions, "config" | "plugins" | "externals"> = {}): GameHandle {
	return bootGame(parent, {
		...options,
		config: config as KaiConfig,
		// In the order their start menu items appear: the status page, then the Journal.
		plugins: [
			triggersPlugin(content.triggers.list),
			catPlugin(),
			arcadePlugin(),
			githubPlugin(),
			ferryIntroPlugin(),
			finalePlugin(),
			presencePlugin(),
			journalPlugin(),
		],
		externals: ({ world, progress }) =>
			fjordExternals({ world, hasStamp: (place) => progress.hasStamp(place), isUnlocked: (name) => isUnlocked(name, progress) }),
	});
}
