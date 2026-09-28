// A live NPC (LiveNpc.ts) whose Discord presence, read from Lanyard, picks where they are
// and what they show, configured by a game's content/presence.json. `?debug&presence=<name>`
// stands in one of the configured mocks for Lanyard, and window.__kaiPresence(name)
// switches it live.
import type { KaiPlugin } from "@datagutt/kai";
import { LanyardClient, PresenceFeed } from "../lanyard.ts";
import type { PresenceConfig } from "./config.ts";
import { LiveNpc } from "./LiveNpc.ts";
import { nowDoing, statusLines } from "./rules.ts";

export type PresenceNpcOptions = {
	/** The Discord user whose presence drives the NPC. */
	discordId: string;
};

export function presenceNpc(config: PresenceConfig, { discordId }: PresenceNpcOptions): KaiPlugin {
	const feed = new PresenceFeed();
	let live: LiveNpc | null = null;
	return {
		name: "presence",
		boot(services, params) {
			const debug = params.has("debug");
			if (debug) feed.subscribe((p) => console.info("[game] presence", p));
			const lanyard = new LanyardClient(discordId, (p) => feed.set(p));
			const mock = debug ? params.get("presence") : null;
			if (mock && config.mocks[mock]) feed.set(config.mocks[mock]);
			else lanyard.start();
			if (debug) {
				(window as unknown as { __kaiPresence?: (name: string) => void }).__kaiPresence = (name) => {
					if (!config.mocks[name]) throw new Error(`No mock presence "${name}": ${Object.keys(config.mocks).join(", ")}`);
					lanyard.stop();
					services.ghosts?.stop();
					feed.set(config.mocks[name]);
				};
			}
			return { stop: () => lanyard.stop() };
		},
		externals: () => ({ lanyard_activity: () => nowDoing(config, feed.current) }),
		mapCreated(world) {
			const night = world.services.night && config.night;
			const npc = new LiveNpc(
				{
					scene: world.scene,
					map: world.map,
					grid: world.grid,
					spots: world.spots,
					doors: world.doors,
					addNpc: (def, actor) => world.addNpc(def, actor, { managed: true }),
					removeNpc: (id) => world.removeNpc(id),
					playerTile: () => world.player.mover.tile,
				},
				config,
				feed,
				world.services.data.npc(config.npc)?.name ?? config.npc,
				// On a story night they wait at the configured place, whatever their presence.
				night ? { place: night.place, asleep: false, wanders: false, emote: null, says: null, dialogue: night.dialogue } : null,
			);
			live = npc;
			world.onShutdown(() => {
				npc.destroy();
				if (live === npc) live = null;
			});
		},
		update(world, dt, time) {
			if (!live) return;
			// Their bubbles step aside for the interaction prompt over them.
			live.quiet = world.promptNpc === config.npc;
			live.update(dt, time);
		},
		promptFor: (_world, npc) => (npc.id === config.npc && npc.dialogue === config.asleepKnot ? "Wake" : null),
		talked(world, npc, knot, reached) {
			// Woken up and talked to: out of bed rather than lying back down.
			if (!reached || npc.id !== config.npc || knot !== config.asleepKnot) return;
			live?.wokenByPlayer();
			if (config.wakeGrants) world.achieve(config.wakeGrants);
		},
		menuItems: ({ services: { data } }) => [{ id: "status", label: data.t("menu.status"), title: data.t("status.title"), lines: () => statusLines(config, feed.current) }],
		debug: () => ({ presence: feed.current, liveNpc: live?.state }),
	};
}
