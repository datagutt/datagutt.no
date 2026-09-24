import { describe, expect, it } from "vitest";
import type { Presence } from "../lanyard.ts";
import { presenceConfig } from "./config.ts";
import { doingFor, nextMap, nowDoing, statusLines } from "./rules.ts";

const config = presenceConfig.parse({
	npc: "dev",
	asleepKnot: "dev_asleep",
	places: {
		desk: { map: "home-up", where: "At the desk." },
		bed: { map: "home-up", where: "Asleep." },
		fjord: { map: "town", where: "By the water." },
		square: { map: "town", where: "In the square." },
	},
	routes: { "home-up": ["home"], home: ["home-up", "town"], town: ["home"] },
	coding: "visual studio|vs ?code|n?vim",
	rules: [
		{ when: "none", place: "desk" },
		{ when: "offline", place: "bed", emote: "sleep", asleep: true, quiet: true },
		{ when: "coding", place: "desk", emote: "computer" },
		{ when: "playing", place: "desk", emote: "computer" },
		{ when: "music", place: "fjord", emote: "music" },
		{ when: "idle", place: "square", emote: "dots" },
		{ when: "online", place: "square", wanders: true },
	],
	lines: {
		codingDetails: "Busy in {app}: {details}.",
		coding: "Writing code in {app}.",
		streaming: "Streaming {game}.",
		playing: "Playing {game}.",
		music: 'Listening to "{song}" by {artist}.',
	},
	status: { none: "No word yet.", discord: "Discord: {status}", names: { online: "Online", idle: "Away", dnd: "Busy", offline: "Offline" }, listening: "Listening to {song}", listeningBy: "Listening to {song} by {artist}" },
});

const presence = (p: Partial<Presence>): Presence => ({ status: "online", customStatus: null, spotify: null, activities: [], ...p });
const coding = presence({ status: "dnd", customStatus: "shipping it", activities: [{ kind: "playing", name: "Visual Studio Code", details: "Editing a.ts", state: null }] });
const music = presence({ spotify: { song: "Midnight City", artist: "M83" } });

describe("a live NPC's rules", () => {
	it("pick the place, first rule first", () => {
		expect(doingFor(config, presence({ status: "offline", customStatus: "zzz" }))).toMatchObject({ place: "bed", asleep: true, emote: "sleep", says: null });
		expect(doingFor(config, coding)).toMatchObject({ place: "desk", emote: "computer", says: "shipping it" });
		expect(doingFor(config, presence({ activities: [{ kind: "playing", name: "Factorio", details: null, state: null }] }))).toMatchObject({ place: "desk" });
		expect(doingFor(config, music)).toMatchObject({ place: "fjord", emote: "music" });
		expect(doingFor(config, presence({ status: "idle" }))).toMatchObject({ place: "square", emote: "dots", wanders: false });
		expect(doingFor(config, presence({ customStatus: "touching grass" }))).toMatchObject({ place: "square", wanders: true, says: "touching grass" });
		expect(doingFor(config, null)).toMatchObject({ place: "desk", emote: null });
		expect(doingFor(config, { ...coding, spotify: { song: "x", artist: "y" } }).place).toBe("desk");
	});

	it("find the way between maps by the routes", () => {
		expect(nextMap(config.routes, "home-up", "town")).toBe("home");
		expect(nextMap(config.routes, "home", "town")).toBe("town");
		expect(nextMap(config.routes, "town", "home-up")).toBe("home");
		expect(nextMap(config.routes, "town", "town")).toBeNull();
		expect(nextMap(config.routes, "town", "library")).toBeNull();
	});

	it("say what they are up to, and fill the status page", () => {
		expect(nowDoing(config, coding)).toBe("Busy in Visual Studio Code: Editing a.ts.");
		expect(nowDoing(config, music)).toBe('Listening to "Midnight City" by M83.');
		expect(nowDoing(config, presence({ status: "offline" }))).toBe("");
		expect(statusLines(config, music)).toEqual(["Discord: Online", "Listening to Midnight City by M83", "By the water."]);
		expect(statusLines(config, null)).toEqual(["No word yet.", "At the desk."]);
	});

	it("refuse rules for places that do not exist", () => {
		const broken = presenceConfig.safeParse({ ...config, rules: [...config.rules, { when: "idle", place: "moon" }] });
		expect(broken.error?.issues.map((i) => i.message)).toEqual(['no place "moon" in places']);
	});
});
