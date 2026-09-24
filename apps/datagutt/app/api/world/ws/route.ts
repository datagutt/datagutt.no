import { experimental_upgradeWebSocket, type WebSocketData } from "@vercel/functions";
import { connection } from "next/server";
import { WorldRooms } from "@/lib/world/rooms";

export const maxDuration = 300;

// A ping every 30 s keeps proxies and NATs from dropping idle connections; the browser
// answers at the protocol level.
const PING_INTERVAL_MS = 30_000;

declare global {
	// One set of rooms per server instance, across module reloads.
	var __worldRooms: WorldRooms | undefined;
}
const rooms = (globalThis.__worldRooms ??= new WorldRooms());

function toText(data: WebSocketData): string {
	if (typeof data === "string") return data;
	if (Buffer.isBuffer(data)) return data.toString("utf8");
	if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
	return Buffer.from(data as ArrayBuffer).toString("utf8");
}

export async function GET() {
	// cacheComponents is on: opt out of prerendering so the upgrade runs per request.
	await connection();

	return experimental_upgradeWebSocket(
		(ws) => {
			const socket = { send: (text: string) => ws.send(text) };
			rooms.connect(socket);
			const ping = setInterval(() => {
				try {
					ws.ping();
				} catch {
					// Closing anyway; the close handler cleans up.
				}
			}, PING_INTERVAL_MS);
			const teardown = () => {
				clearInterval(ping);
				rooms.disconnect(socket);
			};
			ws.on("message", (data: WebSocketData) => rooms.receive(socket, toText(data)));
			ws.on("close", teardown);
			ws.on("error", teardown);
		},
		{ maxPayload: 1024 },
	);
}
