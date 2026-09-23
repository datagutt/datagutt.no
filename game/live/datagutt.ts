// The live datagutt NPC (docs/game/PLAN.md M4.2): where Thomas is in town, how he looks
// and what bubble he shows, from his Discord presence (game/net/lanyard.ts). The rules
// are the user's, in DESIGN's open-questions table; the first that matches wins.
import type { Presence } from "../net/lanyard";

/** Places he can be. Each is a `spot` map object named "datagutt-<place>". */
export type Place = "desk" | "bed" | "fjord" | "square";
/** Emote bubbles, from LimeZu's emote sheet (game/ui/Bubbles.ts). */
export type Emote = "computer" | "music" | "sleep" | "dots";

export type Doing = {
	place: Place;
	/** Lying in bed instead of standing. */
	asleep: boolean;
	/** Walks about near his place instead of standing still. */
	wanders: boolean;
	emote: Emote | null;
	/** His custom status, shown in a speech bubble. */
	says: string | null;
};

export const spotId = (place: Place) => `datagutt-${place}`;

/** Which map each place is on. world/gen tests check the spots exist there. */
export const PLACE_MAPS: Record<Place, string> = { desk: "house-up", bed: "house-up", fjord: "town", square: "town" };

/**
 * Maps he walks between, by their doors. He is the only NPC who changes maps, so a small
 * table beats loading every map to search their doors.
 */
const MAP_LINKS: Record<string, string[]> = { "house-up": ["house"], house: ["house-up", "town"], town: ["house"] };

/** The next map on the way from `from` to `to`, or null when there is no way. */
export function nextMap(from: string, to: string): string | null {
	if (from === to) return null;
	const cameFrom = new Map<string, string>([[from, from]]);
	const queue = [from];
	while (queue.length) {
		const map = queue.shift()!;
		for (const next of MAP_LINKS[map] ?? []) {
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

/** Apps that mean he is writing code: editors, IDEs and terminals, as Discord names them. */
const CODING = /visual studio|vs ?code|\bcode\b|cursor|zed|intellij|webstorm|phpstorm|pycharm|rustrover|goland|clion|rider|android studio|xcode|n?vim|neovim|emacs|sublime|windsurf|fleet|terminal|iterm|warp|ghostty|wezterm|alacritty|kitty/i;

export const isCoding = (p: Presence) => p.activities.some((a) => CODING.test(a.name));

/** Where he is and what he looks like doing it. Without presence he sits at his desk. */
export function doingFor(p: Presence | null): Doing {
	const says = p?.customStatus ?? null;
	const at = (place: Place, emote: Emote | null, extra: Partial<Doing> = {}): Doing => ({ place, asleep: false, wanders: false, emote, says, ...extra });
	if (!p) return at("desk", null);
	if (p.status === "offline") return at("bed", "sleep", { asleep: true, says: null });
	if (isCoding(p)) return at("desk", "computer");
	if (p.activities.some((a) => a.kind === "playing" || a.kind === "streaming")) return at("desk", "computer");
	if (p.spotify) return at("fjord", "music");
	if (p.status === "idle") return at("square", "dots");
	return at("square", null, { wanders: true });
}

/** What he is up to, as he would put it in conversation, or "" when nothing stands out. */
export function nowDoing(p: Presence | null): string {
	if (!p || p.status === "offline") return "";
	const coding = p.activities.find((a) => CODING.test(a.name));
	if (coding) return coding.details ? `Just in the middle of something in ${coding.name}. ${coding.details}, to be exact.` : `Just writing some code in ${coding.name}.`;
	const game = p.activities.find((a) => a.kind === "playing" || a.kind === "streaming");
	if (game) return game.kind === "streaming" ? `I'm streaming ${game.name} right now, so wave at the chat.` : `Taking a break with a bit of ${game.name}.`;
	if (p.spotify) return `I'm listening to "${p.spotify.song}" by ${p.spotify.artist}. Good song for the fjord.`;
	return "";
}

const STATUS: Record<Presence["status"], string> = { online: "Online", idle: "Away", dnd: "Do not disturb", offline: "Offline" };
const WHERE: Record<Place, string> = {
	desk: "At his desk, upstairs at home.",
	bed: "Asleep, upstairs at home.",
	fjord: "By the fjord, down at the harbour.",
	square: "Around the town square.",
};

/** The START menu's status screen, one line each. */
export function statusLines(p: Presence | null): string[] {
	if (!p) return ["No word from Thomas yet.", WHERE.desk];
	const lines = [`Discord: ${STATUS[p.status]}`];
	if (p.customStatus) lines.push(`"${p.customStatus}"`);
	for (const a of p.activities) lines.push(a.details ? `${a.name}: ${a.details}` : a.name);
	if (p.spotify) lines.push(`Listening to ${p.spotify.song}${p.spotify.artist ? ` by ${p.spotify.artist}` : ""}`);
	lines.push(WHERE[doingFor(p).place]);
	return lines;
}

/** Stand-in presences for `?debug&presence=<name>` and the e2e tests. */
export const MOCK_PRESENCES: Record<string, Presence> = {
	offline: { status: "offline", customStatus: null, spotify: null, activities: [] },
	coding: {
		status: "dnd",
		customStatus: "shipping it",
		spotify: null,
		activities: [{ kind: "playing", name: "Visual Studio Code", details: "Editing WorldScene.ts", state: "Workspace: datagutt" }],
	},
	gaming: { status: "online", customStatus: null, spotify: null, activities: [{ kind: "playing", name: "Factorio", details: null, state: null }] },
	music: { status: "online", customStatus: null, spotify: { song: "Midnight City", artist: "M83" }, activities: [] },
	idle: { status: "idle", customStatus: null, spotify: null, activities: [] },
	online: { status: "online", customStatus: "touching grass", spotify: null, activities: [] },
};
