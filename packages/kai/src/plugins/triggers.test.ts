import { describe, expect, it } from "vitest";
import { GameData, type GameContent } from "../data.ts";
import type { Trigger } from "../schema/engine.ts";
import { perWorld, type World } from "./api.ts";
import { triggersPlugin } from "./triggers.ts";

const content = {
	places: [
		{ id: "a", name: "A", stamp: true },
		{ id: "b", name: "B", stamp: true },
	],
	unlocks: {},
	npcs: {},
	strings: {},
} as unknown as GameContent;

/** A world with a clock you move by hand, recording what the triggers do. */
function fakeWorld(map = "town", stamps: string[] = []) {
	const log: string[] = [];
	const timers: { at: number; fn: () => void }[] = [];
	const clock = { now: 0 };
	const flags: Record<string, boolean> = {};
	const world = {
		map,
		dialogueOpen: false,
		scene: { time: { get now() { return clock.now; }, delayedCall: (ms: number, fn: () => void) => void timers.push({ at: clock.now + ms, fn }) } },
		services: { data: new GameData(content) },
		progress: { flags, hasStamp: (place: string) => stamps.includes(place) },
		playKnot: (knot: string, _npc: unknown, onEnd: () => void) => {
			log.push(`knot:${knot}`);
			onEnd();
		},
		achieve: (id: string, announce = true) => void log.push(`achieve:${id}${announce ? "" : " (quiet)"}`),
		save: () => void log.push("save"),
	} as unknown as World;
	const advance = (ms: number) => {
		clock.now += ms;
		for (const t of timers.splice(0)) (t.at <= clock.now ? t.fn() : timers.push(t));
	};
	return { world, log, flags, advance };
}

const triggers = (list: unknown[]) => triggersPlugin(list as Trigger[]);

describe("triggers", () => {
	it("fire on arriving at their map, after the delay", () => {
		const plugin = triggers([{ on: "enterMap", map: "mountain", delay: 600, grant: "summit", announce: true }]);
		const town = fakeWorld("town");
		plugin.mapCreated!(town.world);
		town.advance(1000);
		expect(town.log).toEqual([]);

		const mountain = fakeWorld("mountain");
		plugin.mapCreated!(mountain.world);
		mountain.advance(500);
		expect(mountain.log).toEqual([]);
		mountain.advance(100);
		expect(mountain.log).toEqual(["achieve:summit"]);
	});

	it("play their knot, then grant, and keep quiet for the cooldown", () => {
		const plugin = triggers([{ on: "bumpEdge", cooldown: 20_000, knot: "edge", grant: "edge", announce: true }]);
		const { world, log, advance } = fakeWorld();
		plugin.bumpedEdge!(world);
		plugin.bumpedEdge!(world);
		expect(log).toEqual(["knot:edge", "achieve:edge"]);
		advance(20_000);
		plugin.bumpedEdge!(world);
		expect(log).toHaveLength(4);
	});

	it("check a full passport on every map and after the last stamp, quietly when asked", () => {
		const plugin = triggers([{ on: "passportFull", grant: "passport", announce: false }]);
		const half = fakeWorld("town", ["a"]);
		plugin.mapCreated!(half.world);
		expect(half.log).toEqual([]);
		const full = fakeWorld("town", ["a", "b"]);
		plugin.stamped!(full.world, "b", true);
		expect(full.log).toEqual(["achieve:passport (quiet)"]);
	});

	it("set a flag and save when they grant nothing", () => {
		const plugin = triggers([{ on: "enterMap", map: "town", delay: 0, flag: "visited", announce: true }]);
		const { world, log, flags, advance } = fakeWorld();
		plugin.mapCreated!(world);
		advance(0);
		expect(flags.visited).toBe(true);
		expect(log).toEqual(["save"]);
	});
});

describe("perWorld", () => {
	it("keeps one state per world", () => {
		const count = perWorld(() => ({ n: 0 }));
		const a = {} as World;
		const b = {} as World;
		count(a).n++;
		count(a).n++;
		expect(count(a).n).toBe(2);
		expect(count(b).n).toBe(0);
	});
});
