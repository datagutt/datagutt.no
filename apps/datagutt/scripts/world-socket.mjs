// The world socket (lib/world/rooms.ts) on a plain Node HTTP server, for the dev harness
// and tests. Production runs the same rooms in app/api/world/ws/route.ts, on Vercel's
// WebSocket upgrade, which `next dev` and `next start` don't provide.
import { WebSocketServer } from "ws";
import { WORLD_SOCKET_PATH } from "../game/net/protocol.ts";
import { WorldRooms } from "../lib/world/rooms.ts";

/** Handle upgrades to the world socket path on `server`; returns the rooms. */
export function attachWorldSocket(server, rooms = new WorldRooms()) {
	const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
	server.on("upgrade", (req, socket, head) => {
		if (new URL(req.url ?? "/", "http://localhost").pathname !== WORLD_SOCKET_PATH) {
			socket.destroy();
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			const member = { send: (text) => ws.send(text) };
			rooms.connect(member);
			ws.on("message", (data) => rooms.receive(member, data.toString()));
			ws.on("close", () => rooms.disconnect(member));
			ws.on("error", () => rooms.disconnect(member));
		});
	});
	return rooms;
}
