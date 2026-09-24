// Runs the declarative triggers (content/triggers.json): arriving on a map, walking into
// its edge, a full passport.
import type { Trigger } from "@datagutt/kai/schema/engine";
import { passportFull } from "../progress/passport";
import type { KaiPlugin, World } from "./api";

export function triggersPlugin(triggers: readonly Trigger[]): KaiPlugin {
	/** When each bumpEdge trigger may fire again, by its index. */
	const quietUntil = new Map<number, number>();

	function fire(world: World, trigger: Trigger) {
		const grant = () => {
			if (trigger.flag) world.progress.flags[trigger.flag] = true;
			if (trigger.grant) world.achieve(trigger.grant, trigger.announce);
			else if (trigger.flag) world.save();
		};
		if (trigger.knot) world.playKnot(trigger.knot, null, grant);
		else grant();
	}

	function checkPassport(world: World) {
		if (!passportFull(world.progress)) return;
		for (const trigger of triggers) if (trigger.on === "passportFull") fire(world, trigger);
	}

	return {
		name: "triggers",
		mapCreated(world) {
			for (const trigger of triggers) {
				if (trigger.on === "enterMap" && trigger.map === world.map) world.scene.time.delayedCall(trigger.delay, () => fire(world, trigger));
			}
			checkPassport(world);
		},
		stamped(world, _place, complete) {
			if (complete) checkPassport(world);
		},
		bumpedEdge(world) {
			const now = world.scene.time.now;
			triggers.forEach((trigger, i) => {
				if (trigger.on !== "bumpEdge" || world.dialogueOpen || now < (quietUntil.get(i) ?? 0)) return;
				quietUntil.set(i, now + trigger.cooldown);
				fire(world, trigger);
			});
		},
	};
}
