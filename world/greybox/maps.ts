// Greybox maps for the engine core (docs/game/PLAN.md M1.12): enough town to test
// walking, doors, signs and NPCs before the real layout in M3.
import type { MapSpec } from "../tiled.ts";
import { CharGrid, seeded } from "../grid.ts";
import { GREYBOX_TILES } from "./tiles.ts";

const legend = Object.fromEntries(GREYBOX_TILES.map((t, i) => [t.char, i]));

/** A red house: two roof rows, then a wall row with windows and a door row. */
function redHouse(g: CharGrid, x: number, y: number, w: number, doorOffset: number) {
	g.rect(x, y, w, 2, "R");
	g.rect(x, y + 2, w, 2, "H");
	for (let i = 1; i < w - 1; i += 3) g.set(x + i, y + 2, "O");
	g.set(x + doorOffset, y + 3, "D");
}

function town(): MapSpec {
	const W = 40;
	const H = 34;
	const g = new CharGrid(W, H, ".");
	const rand = seeded(7);

	// Forest edge along the top and sides.
	g.rect(0, 0, W, 2, "t");
	g.rect(0, 0, 2, 24, "t");
	g.rect(W - 2, 0, 2, 24, "t");
	for (let x = 2; x < W - 2; x++) if (rand() < 0.35) g.set(x, 2, "t");

	// The fjord: beach, water, deep water.
	g.rect(0, 23, W, 2, ":");
	g.rect(0, 25, W, H - 25, "~");
	g.rect(0, 29, W, H - 29, "w");
	g.rect(0, 20, 2, 5, "^").rect(W - 2, 20, 2, 5, "^");

	// Ferry dock reaching into the water.
	g.rect(18, 23, 3, 8, "d");
	g.rect(15, 29, 9, 2, "d");

	// Paths: dock up to the square, square to each door.
	g.line(19, 12, 19, 22, "=");
	g.rect(14, 9, 12, 4, "=");
	g.line(9, 7, 9, 10, "=").line(9, 10, 14, 10, "=");
	g.line(30, 7, 30, 10, "=").line(25, 10, 30, 10, "=");

	redHouse(g, 6, 3, 7, 3); // datagutt's house, door at (9, 6)
	redHouse(g, 26, 3, 9, 4); // office, door at (30, 6)

	// Square details and scattered nature, kept off the paths.
	g.stamp(15, 13, ["*  *"]).stamp(22, 13, ["* *"]);
	for (let i = 0; i < 40; i++) {
		const x = 2 + Math.floor(rand() * (W - 4));
		const y = 13 + Math.floor(rand() * 9);
		g.paintOver(x, y, rand() < 0.5 ? "u" : rand() < 0.5 ? "t" : rand() < 0.5 ? "o" : "*", ".");
	}
	// Keep a clear verge either side of the main path.
	for (let y = 12; y < 23; y++) g.set(18, y, ".").set(20, y, ".");
	g.set(22, 11, "S").set(31, 7, "S");

	return {
		id: "town",
		width: W,
		height: H,
		legend,
		layers: [{ name: "ground", rows: g.rows() }],
		properties: { name: "Fjord Town" },
		objects: [
			{ type: "spawn", id: "ferry", x: 19, y: 28, facing: "up" },
			{ type: "spawn", id: "house_door", x: 9, y: 7, facing: "down" },
			{ type: "spawn", id: "office_door", x: 30, y: 7, facing: "down" },
			{ type: "door", x: 9, y: 6, toMap: "house", toSpawn: "entrance" },
			{ type: "sign", x: 22, y: 11, text: "Welcome to Fjord Town. Population: small, but opinionated." },
			{ type: "sign", x: 31, y: 7, text: "Nettbureau. Closed for the greybox. Come back when the art arrives." },
			{
				type: "npc",
				id: "ferryman",
				character: "ferryman",
				x: 21,
				y: 29,
				facing: "up",
				text: "Hei! Welcome ashore. Walk with the arrow keys or WASD, or tap where you want to go.",
			},
		],
	};
}

function houseInterior(): MapSpec {
	const W = 12;
	const H = 9;
	const g = new CharGrid(W, H, "_");
	g.frame(0, 0, W, H, "X");
	g.rect(1, 1, W - 2, 2, "|");
	g.stamp(1, 3, ["BB P    b "]);
	g.stamp(1, 4, ["        b "]);
	g.stamp(4, 5, ["rrr"]).stamp(4, 6, ["rTr"]);
	g.set(6, H - 1, "_"); // the doorway
	return {
		id: "house",
		width: W,
		height: H,
		legend,
		layers: [{ name: "ground", rows: g.rows() }],
		properties: { name: "datagutt's house" },
		objects: [
			{ type: "spawn", id: "entrance", x: 6, y: 7, facing: "up" },
			{ type: "door", x: 6, y: 8, toMap: "town", toSpawn: "house_door" },
			{
				type: "npc",
				id: "datagutt",
				character: "datagutt",
				x: 4,
				y: 4,
				facing: "down",
				text: "Oh, hi! I'm Thomas. This is still a greybox, but it's going to be a whole town.",
			},
			{ type: "sign", x: 4, y: 3, text: "* It's a PC. Several terminals are open. Something is compiling." },
		],
	};
}

export const GREYBOX_MAPS: MapSpec[] = [town(), houseInterior()];
