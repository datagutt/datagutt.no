// The live datagutt NPC (LiveThomas): Thomas's Discord presence, read from Lanyard, picks
// where he is and what he shows. `?debug&presence=<name>` stands in a fixed presence
// (MOCK_PRESENCES) for Lanyard, and window.__fjordPresence(name) switches it live.
import { LanyardClient, PresenceFeed, type WorldState } from "@datagutt/kai-live";
import { LiveThomas, THOMAS_ID } from "../entities/LiveThomas";
import { MOCK_PRESENCES, nowDoing, statusLines } from "../live/datagutt";
import { npc as rosterNpc } from "../npcs";
import { FINALE_KNOT } from "./finale";
import type { KaiPlugin } from "@datagutt/kai";

export function presencePlugin(live: WorldState): KaiPlugin {
	const feed = new PresenceFeed();
	let thomas: LiveThomas | null = null;
	return {
		name: "presence",
		boot(services, params) {
			const debug = params.has("debug");
			if (debug) feed.subscribe((p) => console.info("[game] presence", p));
			const lanyard = new LanyardClient(live.discordId, (p) => feed.set(p));
			const mock = debug ? params.get("presence") : null;
			if (mock && MOCK_PRESENCES[mock]) feed.set(MOCK_PRESENCES[mock]);
			else lanyard.start();
			if (debug) {
				(window as unknown as { __fjordPresence?: (name: string) => void }).__fjordPresence = (name) => {
					if (!MOCK_PRESENCES[name]) throw new Error(`No mock presence "${name}": ${Object.keys(MOCK_PRESENCES).join(", ")}`);
					lanyard.stop();
					services.ghosts?.stop();
					feed.set(MOCK_PRESENCES[name]);
				};
			}
			return { stop: () => lanyard.stop() };
		},
		externals: () => ({ lanyard_activity: () => nowDoing(feed.current) }),
		mapCreated(world) {
			const live = new LiveThomas(
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
				feed,
				rosterNpc(THOMAS_ID)?.name ?? "Thomas",
				// On the finale's night he waits at the end of the pier, whatever his presence.
				world.services.night ? { place: "pier", asleep: false, wanders: false, emote: null, says: null, dialogue: FINALE_KNOT } : null,
			);
			thomas = live;
			world.onShutdown(() => {
				live.destroy();
				if (thomas === live) thomas = null;
			});
		},
		update(world, dt, time) {
			if (!thomas) return;
			// His bubbles step aside for the interaction prompt over him.
			thomas.quiet = world.promptNpc === THOMAS_ID;
			thomas.update(dt, time);
		},
		promptFor: (_world, npc) => (npc.id === THOMAS_ID && npc.dialogue.endsWith("_asleep") ? "Wake" : null),
		talked(world, npc, knot, reached) {
			// Woken up and talked to: he gets out of bed rather than lying back down.
			if (!reached || npc.id !== THOMAS_ID || knot !== "datagutt_asleep") return;
			thomas?.wokenByPlayer();
			world.achieve("wake");
		},
		menuItems: ({ services: { data } }) => [{ id: "status", label: data.t("menu.status"), title: data.t("status.title"), lines: () => statusLines(feed.current) }],
		debug: () => ({ presence: feed.current, thomas: thomas?.state }),
	};
}
