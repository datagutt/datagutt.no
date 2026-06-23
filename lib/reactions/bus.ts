import type { ReactionEvent } from "./types";

// Minimal structural view of a `ws` socket. Decouples the bus from the exact
// WebSocket type @vercel/functions hands the route handler, so a version skew
// between `ws` and `@vercel/functions` can't break this module.
export type ReactionSocket = {
	readonly OPEN: number;
	readonly readyState: number;
	send(data: string): void;
};

declare global {
	// eslint-disable-next-line no-var
	var __rx_bus: Set<ReactionSocket> | undefined;
}

const subscribers: Set<ReactionSocket> =
	globalThis.__rx_bus ?? (globalThis.__rx_bus = new Set());

export function subscribe(socket: ReactionSocket): () => void {
	subscribers.add(socket);
	return () => {
		subscribers.delete(socket);
	};
}

// Fan out to every connection on this instance except the originator. The
// sender already renders its own drop optimistically, so echoing it back would
// double-render. Skipping origin also removes any need for sid-based filtering
// on the client.
export function publish(event: ReactionEvent, origin?: ReactionSocket): void {
	const msg = JSON.stringify(event);
	for (const socket of subscribers) {
		if (socket === origin) continue;
		if (socket.readyState !== socket.OPEN) {
			subscribers.delete(socket);
			continue;
		}
		try {
			socket.send(msg);
		} catch {
			subscribers.delete(socket);
		}
	}
}
