import type { ReactionEvent } from "./types";

type Controller = ReadableStreamDefaultController<Uint8Array>;

const ENCODER = new TextEncoder();

declare global {
	// eslint-disable-next-line no-var
	var __rx_bus: Set<Controller> | undefined;
}

const subscribers: Set<Controller> =
	globalThis.__rx_bus ?? (globalThis.__rx_bus = new Set());

export function subscribe(controller: Controller): () => void {
	subscribers.add(controller);
	return () => {
		subscribers.delete(controller);
	};
}

export function publish(event: ReactionEvent): void {
	const chunk = ENCODER.encode(`data: ${JSON.stringify(event)}\n\n`);
	for (const c of subscribers) {
		try {
			c.enqueue(chunk);
		} catch {
			subscribers.delete(c);
		}
	}
}

export function broadcastHeartbeat(): void {
	const chunk = ENCODER.encode(`:hb\n\n`);
	for (const c of subscribers) {
		try {
			c.enqueue(chunk);
		} catch {
			subscribers.delete(c);
		}
	}
}
