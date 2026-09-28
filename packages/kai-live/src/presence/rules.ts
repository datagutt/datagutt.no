// How a presence becomes a place, a look and words, by a live NPC's configuration. Pure,
// so it can be tested; LiveNpc.ts acts on it.
import { format } from "@datagutt/kai/ui/strings";
import type { Presence } from "../lanyard.ts";
import type { PresenceConfig, PresenceRule } from "./config.ts";

export type Doing = {
	place: string;
	/** Lying in bed instead of standing. */
	asleep: boolean;
	/** Walks about near their place instead of standing still. */
	wanders: boolean;
	emote: PresenceRule["emote"];
	/** Their custom status, shown in a speech bubble. */
	says: string | null;
	/** Ink knot to talk with instead of their own (a story night). */
	dialogue?: string;
};

/** The spot map object for a place: `<npc>-<place>`. */
export const spotId = (config: Pick<PresenceConfig, "npc">, place: string) => `${config.npc}-${place}`;

const codingApp = (config: PresenceConfig, p: Presence) => {
	const coding = new RegExp(config.coding, "i");
	return p.activities.find((a) => coding.test(a.name));
};

function matches(config: PresenceConfig, when: PresenceRule["when"], p: Presence | null): boolean {
	if (when === "none") return p === null;
	if (!p) return false;
	switch (when) {
		case "offline":
			return p.status === "offline";
		case "coding":
			return codingApp(config, p) !== undefined;
		case "playing":
			return p.activities.some((a) => a.kind === "playing" || a.kind === "streaming");
		case "music":
			return p.spotify !== null;
		case "idle":
			return p.status === "idle";
		case "online":
			return true;
	}
}

/** Where they are and what they look like doing it: the first rule that matches. */
export function doingFor(config: PresenceConfig, p: Presence | null): Doing {
	const rule = config.rules.find((r) => matches(config, r.when, p)) ?? config.rules[0];
	return { place: rule.place, asleep: rule.asleep, wanders: rule.wanders, emote: rule.emote, says: rule.quiet ? null : (p?.customStatus ?? null) };
}

/** What they are up to, as they would put it in conversation, or "" when nothing stands out. */
export function nowDoing(config: PresenceConfig, p: Presence | null): string {
	if (!p || p.status === "offline") return "";
	const { lines } = config;
	const coding = codingApp(config, p);
	if (coding) return coding.details ? format(lines.codingDetails, { app: coding.name, details: coding.details }) : format(lines.coding, { app: coding.name });
	const game = p.activities.find((a) => a.kind === "playing" || a.kind === "streaming");
	if (game) return format(game.kind === "streaming" ? lines.streaming : lines.playing, { game: game.name });
	if (p.spotify) return format(lines.music, { song: p.spotify.song, artist: p.spotify.artist });
	return "";
}

/** The start menu's status page, one line each. */
export function statusLines(config: PresenceConfig, p: Presence | null): string[] {
	const where = (place: string) => config.places[place]?.where ?? place;
	const { status } = config;
	if (!p) return [status.none, where(doingFor(config, null).place)];
	const lines = [format(status.discord, { status: status.names[p.status] })];
	if (p.customStatus) lines.push(`"${p.customStatus}"`);
	for (const a of p.activities) lines.push(a.details ? `${a.name}: ${a.details}` : a.name);
	if (p.spotify) lines.push(format(p.spotify.artist ? status.listeningBy : status.listening, { song: p.spotify.song, artist: p.spotify.artist }));
	lines.push(where(doingFor(config, p).place));
	return lines;
}

/** The next map on the way from `from` to `to` by the configured routes, or null when there is no way. */
export function nextMap(routes: PresenceConfig["routes"], from: string, to: string): string | null {
	if (from === to) return null;
	const cameFrom = new Map<string, string>([[from, from]]);
	const queue = [from];
	while (queue.length) {
		const map = queue.shift()!;
		for (const next of routes[map] ?? []) {
			if (cameFrom.has(next)) continue;
			cameFrom.set(next, map);
			if (next === to) {
				let step = next;
				while (cameFrom.get(step) !== from) step = cameFrom.get(step)!;
				return step;
			}
			queue.push(next);
		}
	}
	return null;
}
