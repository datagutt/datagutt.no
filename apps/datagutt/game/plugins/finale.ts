// Fjord Town's finale: the last stamp brings a note from Thomas, then night falls on every
// map and he waits at the end of the pier; his goodbye, the credits, and how to reach him.
// `?debug&finale` starts on the pier.
import { CreditsRoll } from "@datagutt/kai/ui/CreditsRoll";
import type { KaiPlugin } from "@datagutt/kai";

/** `knot`: Thomas's words on the pier (content/presence.json `night.dialogue`). */
export function finalePlugin({ knot }: { knot: string }): KaiPlugin {
	let rolling = false;
	return {
		name: "finale",
		boot(services, params) {
			if (!params.has("debug") || !params.has("finale")) return;
			services.night = true;
			services.start = { map: "town", spawn: "finale" };
			return { start: true };
		},
		stamped(world, _place, complete) {
			if (!complete || world.progress.flags.finale) return;
			// Once the last stamp's banner has had its moment.
			world.scene.time.delayedCall(1600, () =>
				world.playKnot("finale_note", null, () => {
					world.services.night = true;
					world.goTo({ map: "town", spawn: "finale" });
				}),
			);
		},
		talk(world, npc) {
			if (npc.dialogue !== knot) return false;
			world.playKnot(npc.dialogue, npc, () => {
				const roll = new CreditsRoll(world.scene, world.services.data.content.credits, world.progress.reducedMotion, () => {
					rolling = false;
					world.achieve("credits");
					world.playKnot("datagutt_contact", npc, () => {
						// This night stays until the player moves on; the next map is back to normal.
						world.progress.flags.finale = true;
						world.services.night = false;
						world.save();
					});
				});
				rolling = true;
				world.takeOver({
					name: "credits",
					music: "credits",
					update(dt, input) {
						roll.update(dt, input);
						return rolling;
					},
				});
			});
			return true;
		},
		debug: (world) => ({ finale: world.services.night, credits: rolling }),
	};
}
