import { broadcastHeartbeat, subscribe } from "@/lib/reactions/bus";

export const maxDuration = 300;

const ENCODER = new TextEncoder();

export async function GET(req: Request) {
	let unsubscribe: (() => void) | null = null;
	let heartbeat: ReturnType<typeof setInterval> | null = null;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(ENCODER.encode(": ok\n\n"));
			unsubscribe = subscribe(controller);
			heartbeat = setInterval(() => {
				try {
					broadcastHeartbeat();
				} catch {
					// noop
				}
			}, 25_000);
		},
		cancel() {
			if (heartbeat) clearInterval(heartbeat);
			unsubscribe?.();
		},
	});

	req.signal.addEventListener("abort", () => {
		if (heartbeat) clearInterval(heartbeat);
		unsubscribe?.();
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
		},
	});
}
