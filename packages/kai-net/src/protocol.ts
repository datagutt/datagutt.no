// The world socket's messages (apps/datagutt/docs/PLAN.md M4.3): visitors see each other as ghosts.
// One room per map. A client joins the room of the map it is on and reports its tile when
// it changes; the server gives each connection a random name and tint, tells the room
// who came, moved, emoted or left, and never echoes a message back to its sender.
// Shared by the game (client), the Vercel route and the dev harness server, which loads
// it with Node's type stripping: keep it free of runtime imports.

/** A direction on the tile grid. The runtime's map objects use this same type. */
export type Facing = "right" | "up" | "left" | "down";

export const WORLD_SOCKET_PATH = "/api/world/ws";

/** Emotes a visitor can show others (a subset of game/ui/emotes.ts, kept literal here). */
export const GHOST_EMOTES = ["exclaim", "question", "heart", "music", "dots"] as const;
export type GhostEmote = (typeof GHOST_EMOTES)[number];

export type Ghost = { id: string; name: string; tint: string; x: number; y: number; facing: Facing };

export type ClientMessage =
	| { t: "join"; map: string; x: number; y: number; facing: Facing }
	| { t: "move"; x: number; y: number; facing: Facing }
	| { t: "emote"; emote: GhostEmote }
	| { t: "leave" };

export type ServerMessage =
	/** Who you are to the others. */
	| { t: "welcome"; id: string; name: string; tint: string }
	/** Everyone already in the room you joined. */
	| { t: "room"; map: string; ghosts: Ghost[] }
	| { t: "joined"; ghost: Ghost }
	| { t: "moved"; id: string; x: number; y: number; facing: Facing }
	| { t: "emoted"; id: string; emote: GhostEmote }
	| { t: "left"; id: string };

const FACINGS: readonly Facing[] = ["right", "up", "left", "down"];
/** Map ids as the generator names them; bounds the room names a client can make. */
const MAP_ID = /^[a-z0-9-]{1,32}$/;
/** No map is this big; bounds what a client can claim. */
const MAX_TILE = 512;

const isTile = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < MAX_TILE;
const isFacing = (v: unknown): v is Facing => FACINGS.includes(v as Facing);

/** A client message checked field by field, or null for anything malformed. */
export function parseClientMessage(text: string): ClientMessage | null {
	let raw: Record<string, unknown>;
	try {
		raw = JSON.parse(text) as Record<string, unknown>;
	} catch {
		return null;
	}
	if (!raw || typeof raw !== "object") return null;
	switch (raw.t) {
		case "join":
			return typeof raw.map === "string" && MAP_ID.test(raw.map) && isTile(raw.x) && isTile(raw.y) && isFacing(raw.facing)
				? { t: "join", map: raw.map, x: raw.x, y: raw.y, facing: raw.facing }
				: null;
		case "move":
			return isTile(raw.x) && isTile(raw.y) && isFacing(raw.facing) ? { t: "move", x: raw.x, y: raw.y, facing: raw.facing } : null;
		case "emote":
			return GHOST_EMOTES.includes(raw.emote as GhostEmote) ? { t: "emote", emote: raw.emote as GhostEmote } : null;
		case "leave":
			return { t: "leave" };
		default:
			return null;
	}
}

/** A server message, trusted in shape (it comes from our server) but still parsed safely. */
export function parseServerMessage(text: string): ServerMessage | null {
	try {
		const raw = JSON.parse(text) as ServerMessage;
		return raw && typeof raw === "object" && typeof raw.t === "string" ? raw : null;
	} catch {
		return null;
	}
}
