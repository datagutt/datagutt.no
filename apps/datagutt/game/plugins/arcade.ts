// Fjord Town's cabinets (the registry in ../arcade): step up to one and its game has the
// frame until the player leaves. The binoculars on the radio hill show stars only after
// dark, and Thomas's PC runs a screensaver.
import { ArcadeScreen } from "@datagutt/kai-arcade/screen";
import type { PromptAction } from "@datagutt/kai/ui/Prompt";
import { makeArcade } from "../arcade";
import { isArcadeId, type ArcadeId } from "../arcade/ids";
import { perWorld, tileKey, type KaiPlugin, type ObjectOf, type World } from "@datagutt/kai";

/** The falling blocks score that earns "High score". */
export const BLOCKS_TARGET = 1000;

const PROMPTS: Partial<Record<ArcadeId, PromptAction>> = { stargazing: "Look", screensaver: "Use" };

export function arcadePlugin(): KaiPlugin {
	const cabinets = perWorld(() => new Map<string, ObjectOf<"arcade">>());
	let playing: string | null = null;

	function play(world: World, cabinet: ObjectOf<"arcade">) {
		if (cabinet.game === "stargazing" && world.daylight.dark < 0.5) return world.playKnot("binoculars_by_day", null, () => {});
		if (!isArcadeId(cabinet.game)) return;
		if (cabinet.game === "stargazing") world.achieve("stars");
		const progress = world.progress;
		const game = makeArcade(cabinet.game, {
			best: (name) => progress.records[name] ?? 0,
			record: (name, score) => {
				if (progress.record(name, score)) world.save();
				if (name === "blocks" && score >= BLOCKS_TARGET) world.achieve("blocks");
			},
		});
		const screen = new ArcadeScreen(world.scene, game, world.services.data, () => world.save());
		playing = game.title;
		world.takeOver({
			name: game.title,
			update(dt, input) {
				const on = screen.update(dt, input);
				if (!on) playing = null;
				return on;
			},
		});
	}

	return {
		name: "arcade",
		objects: {
			arcade: (world, cabinet) => void cabinets(world).set(tileKey(cabinet), cabinet),
		},
		usableAt(world, p) {
			const cabinet = cabinets(world).get(tileKey(p));
			if (!cabinet) return null;
			return { prompt: (isArcadeId(cabinet.game) && PROMPTS[cabinet.game]) || "Play", use: () => play(world, cabinet) };
		},
		debug: () => ({ arcade: playing }),
	};
}
