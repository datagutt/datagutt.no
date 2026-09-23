// The game's end of the world socket (protocol in ./protocol.ts): reports which map the
// player is on and where, passes on what the room says, and rejoins after a reconnect.
// Visitors can switch it off with localStorage `rx_off` (DESIGN §14, the old reactions
// kill switch), in which case nothing is sent or received.
import { OPEN, Reconnecting, browserSocket, type SocketLike } from "./reconnect";
import { parseServerMessage, WORLD_SOCKET_PATH, type ClientMessage, type GhostEmote, type ServerMessage } from "./protocol";
import type { Facing } from "../world/objects";

type Where = { map: string; x: number; y: number; facing: Facing };

/** Whether the visitor has other visitors switched off (`localStorage.rx_off = "1"`). */
export function ghostsDisabled(storage: Pick<Storage, "getItem"> | null): boolean {
	try {
		return storage?.getItem("rx_off") === "1";
	} catch {
		return false;
	}
}

export const worldSocketUrl = (location: Pick<Location, "protocol" | "host">) =>
	`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${WORLD_SOCKET_PATH}`;

export class GhostClient {
	private readonly connection: Reconnecting;
	private readonly listeners = new Set<(message: ServerMessage) => void>();
	private where: Where | null = null;
	/** Who the server says we are, once welcomed. */
	me: { id: string; name: string; tint: string } | null = null;

	constructor(url: string, createSocket: (url: string) => SocketLike = browserSocket) {
		this.connection = new Reconnecting(
			url,
			(socket) => {
				socket.onopen = () => {
					// A fresh connection is a fresh visitor to the server: join again.
					if (this.where) this.send({ t: "join", ...this.where });
				};
				socket.onmessage = (event) => this.receive(String(event.data));
			},
			undefined,
			createSocket,
			{ first: 2_000, max: 60_000 },
		);
	}

	start(): void {
		this.connection.start();
	}

	stop(): void {
		this.connection.stop();
	}

	/** Entering a map: join its room at the player's tile. */
	join(map: string, x: number, y: number, facing: Facing): void {
		this.where = { map, x, y, facing };
		this.send({ t: "join", ...this.where });
	}

	/** The player's tile or facing changed. */
	move(x: number, y: number, facing: Facing): void {
		const w = this.where;
		if (!w || (w.x === x && w.y === y && w.facing === facing)) return;
		Object.assign(w, { x, y, facing });
		this.send({ t: "move", x, y, facing });
	}

	emote(emote: GhostEmote): void {
		this.send({ t: "emote", emote });
	}

	/** Calls `listener` with each message from the room. Returns unsubscribe. */
	subscribe(listener: (message: ServerMessage) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private send(message: ClientMessage): void {
		const socket = this.connection.current;
		// Not connected: drop it. `where` holds the latest position for the rejoin.
		if (socket && (socket.readyState === undefined || socket.readyState === OPEN)) socket.send(JSON.stringify(message));
	}

	private receive(text: string): void {
		const message = parseServerMessage(text);
		if (!message) return;
		if (message.t === "welcome") {
			this.me = { id: message.id, name: message.name, tint: message.tint };
			this.connection.healthy();
		}
		for (const listener of this.listeners) listener(message);
	}
}
