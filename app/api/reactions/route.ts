import { cookies } from "next/headers";
import { publish } from "@/lib/reactions/bus";
import { consume } from "@/lib/reactions/rateLimit";
import {
	REACTION_SECTION_IDS,
	REACTION_TYPES,
	type ReactionEvent,
	type ReactionPayload,
} from "@/lib/reactions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTION_SET = new Set<string>(REACTION_SECTION_IDS);
const TYPE_SET = new Set<string>(REACTION_TYPES);

function shortId(): string {
	const buf = new Uint8Array(6);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => b.toString(36)).join("").slice(0, 8);
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

export async function POST(req: Request) {
	const len = req.headers.get("content-length");
	if (len && Number(len) > 1024) {
		return Response.json({ ok: false, error: "too_large" }, { status: 413 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
	}

	if (!isValid(body)) {
		return Response.json({ ok: false, error: "invalid" }, { status: 400 });
	}

	const jar = await cookies();
	let sid = jar.get("rx_sid")?.value;
	if (!sid) {
		sid = crypto.randomUUID();
		jar.set("rx_sid", sid, {
			httpOnly: false,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
		});
	}

	if (!consume(sid)) {
		return Response.json(
			{ ok: false, error: "rate_limited" },
			{ status: 429, headers: { "Retry-After": "1" } },
		);
	}

	const event: ReactionEvent = {
		id: shortId(),
		sid,
		sectionId: body.sectionId,
		normalizedX: body.normalizedX,
		normalizedY: body.normalizedY,
		type: body.type,
		t: Date.now(),
	};

	publish(event);

	return Response.json({ ok: true, id: event.id });
}
