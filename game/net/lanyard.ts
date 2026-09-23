// Thomas's Discord presence from Lanyard (docs/game/PLAN.md M4.1), which drives the live
// datagutt NPC. A plain WebSocket: the server says hello with a heartbeat interval, we
// subscribe to one user, then get the full state once and every change after it.
// Lanyard only tracks users who are in its Discord server; for anyone else the feed
// stays empty and the NPC keeps its default place.

export const LANYARD_SOCKET = "wss://api.lanyard.rest/socket";

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";
export type ActivityKind = "playing" | "streaming" | "listening" | "watching" | "custom" | "competing";

export type Activity = {
	kind: ActivityKind;
	/** The app or game ("Visual Studio Code", "Spotify"). */
	name: string;
	/** For apps like editors, usually the file or workspace. */
	details: string | null;
	state: string | null;
};

/** What the game needs from a Lanyard presence. */
export type Presence = {
	status: DiscordStatus;
	/**
	 * The custom status text. Its emoji is left out: custom Discord emoji are only a name
	 * ("catLove"), and the game's bitmap font has no emoji glyphs.
	 */
	customStatus: string | null;
	spotify: { song: string; artist: string } | null;
	/** Everything else he is doing, custom status and Spotify left out. */
	activities: Activity[];
};

/** Discord's activity types, by number. */
const KINDS: ActivityKind[] = ["playing", "streaming", "listening", "watching", "custom", "competing"];
const STATUSES: DiscordStatus[] = ["online", "idle", "dnd", "offline"];

type RawActivity = { type?: unknown; name?: unknown; id?: unknown; details?: unknown; state?: unknown };

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** A Lanyard presence object (INIT_STATE or PRESENCE_UPDATE data), checked field by field. */
export function parsePresence(raw: unknown): Presence {
	const data = (raw ?? {}) as { discord_status?: unknown; activities?: unknown; spotify?: { song?: unknown; artist?: unknown } | null };
	const status = STATUSES.includes(data.discord_status as DiscordStatus) ? (data.discord_status as DiscordStatus) : "offline";
	const raws = (Array.isArray(data.activities) ? data.activities : []) as RawActivity[];
	const custom = raws.find((a) => a.type === 4);
	const customStatus = custom ? text(custom.state) : null;
	const song = text(data.spotify?.song);
	const artist = text(data.spotify?.artist);
	const activities = raws
		// Spotify has its own field; Lanyard also lists it as an activity.
		.filter((a) => a.type !== 4 && a.id !== "spotify:1" && typeof a.type === "number" && KINDS[a.type] && text(a.name))
		.map((a) => ({ kind: KINDS[a.type as number], name: text(a.name)!, details: text(a.details), state: text(a.state) }));
	return { status, customStatus, spotify: song ? { song, artist: artist ?? "" } : null, activities };
}

/** The latest presence, for anything that wants to react to it. */
export class PresenceFeed {
	private latest: Presence | null = null;
	private readonly listeners = new Set<(presence: Presence) => void>();

	get current(): Presence | null {
		return this.latest;
	}

	set(presence: Presence): void {
		this.latest = presence;
		for (const listener of this.listeners) listener(presence);
	}

	/** Calls `listener` with every new presence, and now if there already is one. Returns unsubscribe. */
	subscribe(listener: (presence: Presence) => void): () => void {
		this.listeners.add(listener);
		if (this.latest) listener(this.latest);
		return () => this.listeners.delete(listener);
	}
}

/** The part of WebSocket the client uses, so tests can pass a fake. */
export type SocketLike = {
	send(data: string): void;
	close(): void;
	onopen: (() => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onclose: (() => void) | null;
	onerror: (() => void) | null;
};

type Message = { op?: number; t?: string; d?: { heartbeat_interval?: number } & Record<string, unknown> };

const OP = { event: 0, hello: 1, initialize: 2, heartbeat: 3 } as const;
/** Reconnect delays grow from the first to the last, doubling. */
const RETRY_MS = { first: 1_000, max: 60_000 };

/** Keeps one Lanyard subscription alive: heartbeats, and reconnects with backoff. */
export class LanyardClient {
	private socket: SocketLike | null = null;
	private heartbeat: ReturnType<typeof setInterval> | null = null;
	private retry: ReturnType<typeof setTimeout> | null = null;
	private retryMs = RETRY_MS.first;
	private stopped = true;

	constructor(
		private readonly userId: string,
		private readonly onPresence: (presence: Presence) => void,
		private readonly createSocket: (url: string) => SocketLike = (url) => new WebSocket(url) as unknown as SocketLike,
		private readonly url = LANYARD_SOCKET,
	) {}

	start(): void {
		if (!this.stopped) return;
		this.stopped = false;
		this.connect();
	}

	stop(): void {
		this.stopped = true;
		this.clearTimers();
		const socket = this.socket;
		this.socket = null;
		socket?.close();
	}

	private connect(): void {
		let socket: SocketLike;
		try {
			socket = this.createSocket(this.url);
		} catch {
			this.scheduleRetry();
			return;
		}
		this.socket = socket;
		socket.onmessage = (event) => this.receive(socket, event.data);
		socket.onclose = () => {
			if (this.socket !== socket) return;
			this.socket = null;
			this.clearTimers();
			this.scheduleRetry();
		};
		socket.onerror = () => socket.close();
	}

	private receive(socket: SocketLike, data: unknown): void {
		let message: Message;
		try {
			message = JSON.parse(String(data)) as Message;
		} catch {
			return;
		}
		if (message.op === OP.hello) {
			socket.send(JSON.stringify({ op: OP.initialize, d: { subscribe_to_id: this.userId } }));
			const interval = message.d?.heartbeat_interval;
			if (typeof interval === "number" && interval > 0) {
				if (this.heartbeat) clearInterval(this.heartbeat);
				this.heartbeat = setInterval(() => socket.send(JSON.stringify({ op: OP.heartbeat })), interval);
			}
		} else if (message.op === OP.event && (message.t === "INIT_STATE" || message.t === "PRESENCE_UPDATE")) {
			this.retryMs = RETRY_MS.first;
			this.onPresence(parsePresence(message.d));
		}
	}

	private scheduleRetry(): void {
		if (this.stopped) return;
		this.retry = setTimeout(() => {
			this.retry = null;
			if (!this.stopped) this.connect();
		}, this.retryMs);
		this.retryMs = Math.min(this.retryMs * 2, RETRY_MS.max);
	}

	private clearTimers(): void {
		if (this.heartbeat) clearInterval(this.heartbeat);
		if (this.retry) clearTimeout(this.retry);
		this.heartbeat = this.retry = null;
	}
}
