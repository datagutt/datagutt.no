// Fjord Town's finale: a full passport brings a note from Thomas, then night falls on every
// map and he waits at the end of the pier; his goodbye, the credits, and how to reach him.
// `?debug&finale` starts on the pier.
import { CreditsRoll } from "@datagutt/kai/ui/CreditsRoll";
import { perWorld, type KaiPlugin, type World } from "@datagutt/kai";

/** After the last stamp, so its banner has its moment first. */
const AFTER_STAMP_MS = 1600;
/** After arriving on a map, so the fade-in is done. */
const AFTER_ARRIVAL_MS = 600;

/** `knot`: Thomas's words on the pier (content/presence.json `night.dialogue`). */
export function finalePlugin({ knot }: { knot: string }): KaiPlugin {
	let rolling = false;
	/** When the note may start on this map, in scene time, or null when it is not due. */
	const due = perWorld((): { at: number | null } => ({ at: null }));

	// The finale is owed until it has been seen to its end, not only at the moment of the
	// last stamp: a reload after the note (the night is not saved), a door taken before
	// the note starts, or a save that was already full all bring it back on the next map.
	const owed = (world: World) => !world.progress.flags.finale && !world.services.night && world.services.data.passportFull(world.progress);

	return {
		name: "finale",
		boot(services, params) {
			if (!params.has("debug") || !params.has("finale")) return;
			services.night = true;
			services.start = { map: "town", spawn: "finale" };
			return { start: true };
		},
		mapCreated(world) {
			if (owed(world)) due(world).at = world.scene.time.now + AFTER_ARRIVAL_MS;
		},
		stamped(world, _place, complete) {
			if (complete && owed(world)) due(world).at = world.scene.time.now + AFTER_STAMP_MS;
		},
		// Runs only while the world is free, so the note never cuts into a conversation.
		update(world) {
			const state = due(world);
			if (state.at === null || world.scene.time.now < state.at) return;
			state.at = null;
			if (!owed(world)) return;
			world.playKnot("finale_note", null, () => {
				world.services.night = true;
				world.goTo({ map: "town", spawn: "finale" });
			});
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
