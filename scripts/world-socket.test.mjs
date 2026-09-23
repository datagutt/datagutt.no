import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { attachWorldSocket } from "./world-socket.mjs";

let server;
afterEach(() => server?.close());

/** A client that collects what the server sends. */
function client(port) {
	const ws = new WebSocket(`ws://127.0.0.1:${port}/api/world/ws`);
	const inbox = [];
	ws.on("message", (data) => inbox.push(JSON.parse(data.toString())));
	const opened = new Promise((resolve) => ws.once("open", resolve));
	const until = async (t) => {
		for (let i = 0; i < 100; i++) {
			const found = inbox.find((m) => m.t === t);
			if (found) return found;
			await new Promise((r) => setTimeout(r, 10));
		}
		throw new Error(`no "${t}" message; got ${JSON.stringify(inbox)}`);
	};
	return { ws, inbox, opened, until, send: (m) => ws.send(JSON.stringify(m)) };
}

describe("world socket over HTTP", () => {
	it("lets two visitors on the same map see each other move", async () => {
		server = http.createServer();
		attachWorldSocket(server);
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const { port } = server.address();

		const a = client(port);
		const b = client(port);
		await Promise.all([a.opened, b.opened]);
		const aWelcome = await a.until("welcome");
		a.send({ t: "join", map: "town", x: 10, y: 10, facing: "down" });
		await a.until("room");
		b.send({ t: "join", map: "town", x: 12, y: 10, facing: "left" });
		const room = await b.until("room");
		expect(room.ghosts.map((g) => g.id)).toEqual([aWelcome.id]);
		await a.until("joined");

		a.send({ t: "move", x: 11, y: 10, facing: "right" });
		expect(await b.until("moved")).toEqual({ t: "moved", id: aWelcome.id, x: 11, y: 10, facing: "right" });
		a.ws.close();
		expect(await b.until("left")).toEqual({ t: "left", id: aWelcome.id });
		b.ws.close();
	});

	it("turns away other paths", async () => {
		server = http.createServer();
		attachWorldSocket(server);
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/somewhere-else`);
		await expect(new Promise((resolve, reject) => (ws.once("open", resolve), ws.once("error", reject)))).rejects.toBeTruthy();
	});
});
