// Ghost rooms for the world socket (docs/game/PLAN.md M4.3; protocol in
// game/net/protocol.ts). Transport-free, so the Vercel route and the dev harness server
// share it. Fan-out stays within one server instance: two visitors on different
// instances don't see each other, which DESIGN §14 accepts (upgrade path: Redis pub/sub
// or a Durable Object per room).
import {
	parseClientMessage,
	type ClientMessage,
	type Ghost,
	type ServerMessage,
} from "../../game/net/protocol.ts";

/** What a room needs from a connection. */
export type WorldSocket = { send(text: string): void };

type Member = Ghost & { socket: WorldSocket; map: string | null; tokens: number; refilledAt: number };

/**
 * Per-connection rate limit, as a token bucket: moves cost 1, joins 2, emotes 3. A running
 * player crosses 8 tiles a second, so this leaves headroom for that and no more.
 */
const BUCKET = { capacity: 20, perSecond: 10 };
const COST: Record<ClientMessage["t"], number> = { move: 1, join: 2, emote: 3, leave: 1 };

const TOWNS = [
	"Bergen", "Tromsø", "Ålesund", "Bodø", "Lofoten", "Flåm", "Geiranger", "Røros", "Stavanger", "Trondheim",
	"Kristiansand", "Lillehammer", "Hammerfest", "Narvik", "Molde", "Arendal", "Hamar", "Svolvær", "Voss", "Odda",
	"Kirkenes", "Sogndal", "Mandal", "Lyngen", "Halden", "Drøbak", "Egersund", "Namsos", "Alta", "Finnsnes",
];
/** Ghost tints: light enough to read as ghosts over any ground. */
const TINTS = ["ff9aa2", "ffb870", "ffe28a", "b5ead7", "9ad6ff", "c7b8ff", "ffb3e6", "a8f0c6", "f7c59f", "b0c4ff"];

export type RoomOptions = { random?: () => number; now?: () => number };

export class WorldRooms {
	private readonly members = new Map<WorldSocket, Member>();
	private readonly rooms = new Map<string, Set<Member>>();
	private readonly random: () => number;
	private readonly now: () => number;

	constructor(options: RoomOptions = {}) {
		this.random = options.random ?? Math.random;
		this.now = options.now ?? Date.now;
	}

	/** Visitors on a map right now. */
	count(map: string): number {
		return this.rooms.get(map)?.size ?? 0;
	}

	connect(socket: WorldSocket): void {
		const pick = <T>(list: readonly T[]) => list[Math.floor(this.random() * list.length)];
		const id = Math.floor(this.random() * 36 ** 8).toString(36).padStart(8, "0");
		const member: Member = {
			socket,
			id,
			name: `Traveller from ${pick(TOWNS)}`,
			tint: pick(TINTS),
			x: 0,
			y: 0,
			facing: "down",
			map: null,
			tokens: BUCKET.capacity,
			refilledAt: this.now(),
		};
		this.members.set(socket, member);
		this.send(member, { t: "welcome", id, name: member.name, tint: member.tint });
	}

	receive(socket: WorldSocket, text: string): void {
		const member = this.members.get(socket);
		if (!member) return;
		const message = parseClientMessage(text);
		// Garbage costs a token too, so a flood of it is throttled like anything else.
		if (!this.spend(member, message ? COST[message.t] : 1) || !message) return;
		switch (message.t) {
			case "join": {
				this.leaveRoom(member);
				Object.assign(member, { map: message.map, x: message.x, y: message.y, facing: message.facing });
				const room = this.rooms.get(message.map) ?? new Set<Member>();
				this.rooms.set(message.map, room);
				this.send(member, { t: "room", map: message.map, ghosts: [...room].map(ghostOf) });
				room.add(member);
				this.broadcast(member, { t: "joined", ghost: ghostOf(member) });
				break;
			}
			case "move":
				if (!member.map) return;
				Object.assign(member, { x: message.x, y: message.y, facing: message.facing });
				this.broadcast(member, { t: "moved", id: member.id, x: message.x, y: message.y, facing: message.facing });
				break;
			case "emote":
				if (member.map) this.broadcast(member, { t: "emoted", id: member.id, emote: message.emote });
				break;
			case "leave":
				this.leaveRoom(member);
				break;
		}
	}

	disconnect(socket: WorldSocket): void {
		const member = this.members.get(socket);
		if (!member) return;
		this.leaveRoom(member);
		this.members.delete(socket);
	}

	private spend(member: Member, cost: number): boolean {
		const now = this.now();
		member.tokens = Math.min(BUCKET.capacity, member.tokens + ((now - member.refilledAt) / 1000) * BUCKET.perSecond);
		member.refilledAt = now;
		if (member.tokens < cost) return false;
		member.tokens -= cost;
		return true;
	}

	private leaveRoom(member: Member): void {
		if (!member.map) return;
		const room = this.rooms.get(member.map);
		room?.delete(member);
		if (room && !room.size) this.rooms.delete(member.map);
		this.broadcast(member, { t: "left", id: member.id });
		member.map = null;
	}

	/** To everyone else in the sender's room. */
	private broadcast(from: Member, message: ServerMessage): void {
		if (!from.map) return;
		const text = JSON.stringify(message);
		for (const other of this.rooms.get(from.map) ?? []) {
			if (other !== from) this.deliver(other, text);
		}
	}

	private send(member: Member, message: ServerMessage): void {
		this.deliver(member, JSON.stringify(message));
	}

	private deliver(member: Member, text: string): void {
		try {
			member.socket.send(text);
		} catch {
			// A socket that can't take a message is gone; its close handler may not have run.
			this.disconnect(member.socket);
		}
	}
}

const ghostOf = ({ id, name, tint, x, y, facing }: Member): Ghost => ({ id, name, tint, x, y, facing });
