import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanyardClient, parsePresence, PresenceFeed, type Presence, type SocketLike } from "./lanyard";

class FakeSocket implements SocketLike {
	sent: unknown[] = [];
	closed = false;
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onclose: (() => void) | null = null;
	onerror: (() => void) | null = null;
	send(data: string) {
		this.sent.push(JSON.parse(data));
	}
	close() {
		this.closed = true;
		this.onclose?.();
	}
	receive(message: object) {
		this.onmessage?.({ data: JSON.stringify(message) });
	}
}

const coding = {
	discord_status: "dnd",
	listening_to_spotify: true,
	spotify: { song: "Midnight City", artist: "M83", album: "Hurry Up", track_id: "x" },
	activities: [
		{ type: 4, id: "custom", name: "Custom Status", state: "shipping it", emoji: { name: "🚢" } },
		{ type: 2, id: "spotify:1", name: "Spotify", details: "Midnight City", state: "M83" },
		{ type: 0, id: "abc", name: "Visual Studio Code", details: "Editing lanyard.ts", state: "Workspace: datagutt" },
	],
};

describe("parsePresence", () => {
	it("keeps what the game needs and splits out custom status and Spotify", () => {
		expect(parsePresence(coding)).toEqual<Presence>({
			status: "dnd",
			customStatus: "shipping it",
			spotify: { song: "Midnight City", artist: "M83" },
			activities: [{ kind: "playing", name: "Visual Studio Code", details: "Editing lanyard.ts", state: "Workspace: datagutt" }],
		});
	});

	it("falls back to offline and nothing for missing or odd data", () => {
		expect(parsePresence(null)).toEqual({ status: "offline", customStatus: null, spotify: null, activities: [] });
		expect(parsePresence({ discord_status: "away", activities: [{ type: 99, name: "?" }, { type: 0 }] }).activities).toEqual([]);
		// Only an emoji: no status text to show.
		expect(parsePresence({ activities: [{ type: 4, name: "Custom Status", emoji: { name: "catLove", id: "1" } }] }).customStatus).toBeNull();
	});
});

describe("PresenceFeed", () => {
	it("hands the latest presence to new and existing listeners", () => {
		const feed = new PresenceFeed();
		const seen: string[] = [];
		const stop = feed.subscribe((p) => seen.push(p.status));
		feed.set(parsePresence({ discord_status: "online" }));
		feed.subscribe((p) => seen.push(`late ${p.status}`));
		stop();
		feed.set(parsePresence({ discord_status: "idle" }));
		expect(seen).toEqual(["online", "late online", "late idle"]);
	});
});

describe("LanyardClient", () => {
	let sockets: FakeSocket[];
	let presences: Presence[];
	let client: LanyardClient;

	beforeEach(() => {
		vi.useFakeTimers();
		sockets = [];
		presences = [];
		client = new LanyardClient("123", (p) => presences.push(p), () => {
			const socket = new FakeSocket();
			sockets.push(socket);
			return socket;
		});
	});
	afterEach(() => {
		client.stop();
		vi.useRealTimers();
	});

	it("subscribes after hello, heartbeats, and passes on presence events", () => {
		client.start();
		const socket = sockets[0];
		socket.receive({ op: 1, d: { heartbeat_interval: 30_000 } });
		expect(socket.sent).toEqual([{ op: 2, d: { subscribe_to_id: "123" } }]);
		vi.advanceTimersByTime(60_000);
		expect(socket.sent.slice(1)).toEqual([{ op: 3 }, { op: 3 }]);
		socket.receive({ op: 0, t: "INIT_STATE", d: coding });
		socket.receive({ op: 0, t: "PRESENCE_UPDATE", d: { discord_status: "offline", activities: [] } });
		expect(presences.map((p) => p.status)).toEqual(["dnd", "offline"]);
	});

	it("reconnects with a growing delay, and not after stop", () => {
		client.start();
		sockets[0].close();
		vi.advanceTimersByTime(999);
		expect(sockets).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(sockets).toHaveLength(2);
		sockets[1].close();
		vi.advanceTimersByTime(1_000);
		expect(sockets).toHaveLength(2);
		vi.advanceTimersByTime(1_000);
		expect(sockets).toHaveLength(3);
		client.stop();
		expect(sockets[2].closed).toBe(true);
		vi.advanceTimersByTime(120_000);
		expect(sockets).toHaveLength(3);
	});
});
