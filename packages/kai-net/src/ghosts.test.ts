import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GhostClient, ghostsDisabled, worldSocketUrl } from "./ghosts.ts";
import type { SocketLike } from "./reconnect.ts";
import type { ServerMessage } from "./protocol.ts";

class FakeSocket implements SocketLike {
	sent: unknown[] = [];
	readyState = 0;
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onclose: (() => void) | null = null;
	onerror: (() => void) | null = null;
	send(data: string) {
		this.sent.push(JSON.parse(data));
	}
	close() {
		this.readyState = 3;
		this.onclose?.();
	}
	open() {
		this.readyState = 1;
		this.onopen?.();
	}
	receive(message: ServerMessage) {
		this.onmessage?.({ data: JSON.stringify(message) });
	}
}

describe("GhostClient", () => {
	let sockets: FakeSocket[];
	let client: GhostClient;

	beforeEach(() => {
		vi.useFakeTimers();
		sockets = [];
		client = new GhostClient("ws://test/api/world/ws", () => {
			const s = new FakeSocket();
			sockets.push(s);
			return s;
		});
	});
	afterEach(() => {
		client.stop();
		vi.useRealTimers();
	});

	it("joins once connected, sends moves only when something changed, and passes messages on", () => {
		const seen: string[] = [];
		client.subscribe((m) => seen.push(m.t));
		client.start();
		client.join("town", 3, 4, "down");
		expect(sockets[0].sent).toEqual([]); // not open yet
		sockets[0].open();
		client.move(3, 4, "down");
		client.move(4, 4, "right");
		expect(sockets[0].sent).toEqual([
			{ t: "join", map: "town", x: 3, y: 4, facing: "down" },
			{ t: "move", x: 4, y: 4, facing: "right" },
		]);
		sockets[0].receive({ t: "welcome", id: "a", name: "Traveller from Voss", tint: "ffe28a" });
		expect(client.me?.name).toBe("Traveller from Voss");
		expect(seen).toEqual(["welcome"]);
	});

	it("rejoins where the player is now after a reconnect", () => {
		client.start();
		sockets[0].open();
		client.join("town", 1, 1, "up");
		client.move(2, 1, "right");
		sockets[0].close();
		client.move(3, 1, "right"); // while down: remembered, not sent
		vi.advanceTimersByTime(2_000);
		sockets[1].open();
		expect(sockets[1].sent).toEqual([{ t: "join", map: "town", x: 3, y: 1, facing: "right" }]);
	});
});

describe("ghost helpers", () => {
	it("read the kill switch and build the socket URL", () => {
		expect(ghostsDisabled({ getItem: (k) => (k === "rx_off" ? "1" : null) }, "rx_off")).toBe(true);
		expect(ghostsDisabled({ getItem: () => null }, "rx_off")).toBe(false);
		expect(ghostsDisabled(null, "rx_off")).toBe(false);
		expect(worldSocketUrl({ protocol: "https:", host: "datagutt.no" })).toBe("wss://datagutt.no/api/world/ws");
		expect(worldSocketUrl({ protocol: "http:", host: "localhost:3200" })).toBe("ws://localhost:3200/api/world/ws");
	});
});
