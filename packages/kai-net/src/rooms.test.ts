import { describe, expect, it } from "vitest";
import type { ServerMessage } from "./protocol.ts";
import { WorldRooms, type WorldSocket } from "./rooms.ts";

class Inbox implements WorldSocket {
	messages: ServerMessage[] = [];
	send(text: string) {
		this.messages.push(JSON.parse(text));
	}
	take() {
		const out = this.messages;
		this.messages = [];
		return out;
	}
}

function setup() {
	let time = 0;
	let seed = 0.1;
	const rooms = new WorldRooms({ random: () => (seed = (seed * 9301 + 0.49297) % 1), now: () => time });
	const join = (map: string, x = 1, y = 1) => {
		const s = new Inbox();
		rooms.connect(s);
		rooms.receive(s, JSON.stringify({ t: "join", map, x, y, facing: "down" }));
		return s;
	};
	return { rooms, join, tick: (ms: number) => (time += ms) };
}

describe("world rooms", () => {
	it("welcomes each visitor with a name and tint, and shows who is already there", () => {
		const { join } = setup();
		const a = join("town");
		const [welcome, room] = a.take();
		expect(welcome).toMatchObject({ t: "welcome", name: expect.stringMatching(/^Traveller from /), tint: expect.stringMatching(/^[0-9a-f]{6}$/) });
		expect(room).toEqual({ t: "room", map: "town", ghosts: [] });

		const b = join("town", 5, 6);
		const [bWelcome, bRoom] = b.take();
		expect(bRoom).toMatchObject({ t: "room", ghosts: [{ id: (welcome as { id: string }).id, x: 1, y: 1 }] });
		expect(a.take()).toEqual([{ t: "joined", ghost: { id: (bWelcome as { id: string }).id, name: expect.any(String), tint: expect.any(String), x: 5, y: 6, facing: "down" } }]);
	});

	it("tells only the others in the same room about moves and emotes", () => {
		const { rooms, join } = setup();
		const a = join("town");
		const b = join("town");
		const c = join("house");
		a.take();
		b.take();
		c.take();
		rooms.receive(a, JSON.stringify({ t: "move", x: 2, y: 1, facing: "right" }));
		rooms.receive(a, JSON.stringify({ t: "emote", emote: "heart" }));
		expect(a.take()).toEqual([]);
		expect(b.take().map((m) => m.t)).toEqual(["moved", "emoted"]);
		expect(c.take()).toEqual([]);
	});

	it("says goodbye when a visitor changes map or disconnects", () => {
		const { rooms, join } = setup();
		const a = join("town");
		const b = join("town");
		a.take();
		b.take();
		rooms.receive(b, JSON.stringify({ t: "join", map: "house", x: 3, y: 3, facing: "up" }));
		expect(a.take().map((m) => m.t)).toEqual(["left"]);
		rooms.receive(b, JSON.stringify({ t: "join", map: "town", x: 3, y: 3, facing: "up" }));
		expect(a.take().map((m) => m.t)).toEqual(["joined"]);
		rooms.disconnect(b);
		expect(a.take().map((m) => m.t)).toEqual(["left"]);
		expect(rooms.count("town")).toBe(1);
		expect(rooms.count("house")).toBe(0);
	});

	it("ignores malformed messages and throttles floods", () => {
		const { rooms, join, tick } = setup();
		const a = join("town");
		const b = join("town");
		a.take();
		b.take();
		for (const bad of ["nope", "{}", JSON.stringify({ t: "move", x: -1, y: 0, facing: "down" }), JSON.stringify({ t: "join", map: "../etc", x: 0, y: 0, facing: "up" })]) {
			rooms.receive(a, bad);
		}
		expect(b.take()).toEqual([]);
		for (let i = 0; i < 40; i++) rooms.receive(a, JSON.stringify({ t: "move", x: i % 10, y: 0, facing: "left" }));
		const passed = b.take().length;
		expect(passed).toBeLessThan(20);
		tick(1000);
		rooms.receive(a, JSON.stringify({ t: "move", x: 3, y: 3, facing: "left" }));
		expect(b.take()).toHaveLength(1);
	});
});
