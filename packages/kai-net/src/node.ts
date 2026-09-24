// The world socket rooms on a plain Node HTTP server, for the dev harness and tests.
// Production hosts run the same rooms on their own WebSocket upgrade (for Next on
// Vercel, see @datagutt/kai-next), which `next dev` and `next start` don't provide.
import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { WORLD_SOCKET_PATH } from "./protocol.ts";
import { WorldRooms, type WorldSocket } from "./rooms.ts";

/** Handle upgrades to the world socket path on `server`; returns the rooms. */
export function attachWorldSocket(server: Server, rooms = new WorldRooms()): WorldRooms {
	const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
	server.on("upgrade", (req, socket, head) => {
		if (new URL(req.url ?? "/", "http://localhost").pathname !== WORLD_SOCKET_PATH) {
			socket.destroy();
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			const member: WorldSocket = { send: (text) => ws.send(text) };
			rooms.connect(member);
			ws.on("message", (data) => rooms.receive(member, data.toString()));
			ws.on("close", () => rooms.disconnect(member));
			ws.on("error", () => rooms.disconnect(member));
		});
	});
	return rooms;
}
