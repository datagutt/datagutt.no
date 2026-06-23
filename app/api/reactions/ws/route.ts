import {
	experimental_upgradeWebSocket,
	type WebSocketData,
} from "@vercel/functions";
import { connection } from "next/server";
import { publish, subscribe } from "@/lib/reactions/bus";
import { createTokenBucket } from "@/lib/reactions/rateLimit";
import {
	REACTION_SECTION_IDS,
	REACTION_TYPES,
	type ReactionEvent,
	type ReactionPayload,
} from "@/lib/reactions/types";

export const maxDuration = 300;

const SECTION_SET = new Set<string>(REACTION_SECTION_IDS);
const TYPE_SET = new Set<string>(REACTION_TYPES);

// Server-side ping every 30s keeps NAT/proxy timeouts from silently dropping
// idle connections (the SSE version sent a comment heartbeat for the same
// reason). The browser auto-pongs at the protocol level.
const PING_INTERVAL_MS = 30_000;

function shortId(): string {
	const buf = new Uint8Array(6);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => b.toString(36))
		.join("")
		.slice(0, 8);
}

function isValid(body: unknown): body is ReactionPayload {
	if (!body || typeof body !== "object") return false;
	const b = body as Record<string, unknown>;
	return (
		typeof b.sectionId === "string" &&
		SECTION_SET.has(b.sectionId) &&
		typeof b.type === "string" &&
		TYPE_SET.has(b.type) &&
		typeof b.normalizedX === "number" &&
		b.normalizedX >= 0 &&
		b.normalizedX <= 1 &&
		typeof b.normalizedY === "number" &&
		b.normalizedY >= 0 &&
		b.normalizedY <= 1
	);
}

function toText(data: WebSocketData): string {
	if (typeof data === "string") return data;
	if (Buffer.isBuffer(data)) return data.toString("utf8");
	if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
	return Buffer.from(data as ArrayBuffer).toString("utf8");
}

export async function GET() {
	// cacheComponents is enabled, so opt this handler out of static
	// prerendering. The upgrade then runs only at request time.
	await connection();

	return experimental_upgradeWebSocket(
		(ws) => {
			const unsubscribe = subscribe(ws);
			const bucket = createTokenBucket();
			const ping = setInterval(() => {
				try {
					ws.ping();
				} catch {
					// noop
				}
			}, PING_INTERVAL_MS);

			const teardown = () => {
				clearInterval(ping);
				unsubscribe();
			};

			ws.on("message", (data: WebSocketData) => {
				// Every inbound frame costs a token, so a flood of garbage is
				// throttled the same as valid reactions.
				if (!bucket.consume()) return;

				let parsed: unknown;
				try {
					parsed = JSON.parse(toText(data));
				} catch {
					return;
				}
				if (!isValid(parsed)) return;

				const event: ReactionEvent = {
					id: shortId(),
					sectionId: parsed.sectionId,
					normalizedX: parsed.normalizedX,
					normalizedY: parsed.normalizedY,
					type: parsed.type,
					t: Date.now(),
				};

				publish(event, ws);
			});

			ws.on("close", teardown);
			ws.on("error", teardown);
		},
		{ maxPayload: 1024 },
	);
}
