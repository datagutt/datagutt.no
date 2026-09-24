// On a first visit, arriving at the dock: sail in on the ferry and meet Arne (Intro.ts).
// `?intro` plays it again over a save.
import type { KaiPlugin } from "@datagutt/kai";
import { Intro } from "./Intro";

export function ferryIntroPlugin(): KaiPlugin {
	let active = false;
	return {
		name: "ferry-intro",
		mapCreated(world) {
			const ferry = world.areas.get("ferry");
			const arne = world.npc("ferryman");
			const forced = new URLSearchParams(window.location.search).has("intro");
			if (!ferry || !arne || !world.services.firstVisit || world.arrival.target.spawn !== "ferry" || (world.progress.flags.intro && !forced)) return;
			const layers = ["below", "above"].flatMap((name) => world.layers.get(name) ?? []);
			const intro = new Intro(
				world.scene,
				world.player,
				ferry,
				layers,
				world.arrival.tile,
				world.progress.reducedMotion,
				(done) => {
					arne.actor.mover.face("left");
					world.playKnot("ferryman_intro", arne.def, () => {
						world.progress.flags.intro = true;
						world.services.firstVisit = false;
						world.save();
						done();
					});
				},
				() => {},
			);
			active = true;
			world.takeOver({
				name: "intro",
				syncNpcs: true,
				update(_dt, input) {
					intro.update(input);
					active = intro.active;
					return active;
				},
			});
		},
		debug: () => ({ intro: active }),
	};
}
