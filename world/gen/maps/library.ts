// The library (places: library): Solveig and datagutt's open source. Teal walls, red
// herringbone parquet. Bookcases along the back wall with the featured shelf (the pinned
// repos; M3.11 fills it from live data) lit in the middle, book aisles on the left, a
// reading corner on the right, and Solveig's desk facing the door.
import { NPCS } from "../../../game/npcs.ts";
import { bookcase, FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, SHADE } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function library(): MapCanvas {
	const c = new MapCanvas(26, 14);
	const r = { x: 2, y: 1, w: 22, h: 11 };
	room(c, r, { wall: WALLS.teal, floor: FLOORS.herringbone });

	// Back wall, left to right, mixing widths and woods.
	c.stamp(bookcase("wide", 0), 2, 1).stamp(bookcase("narrow", 1), 5, 1).stamp(bookcase("narrow2", 2), 7, 1);
	c.stamp(F.plantTall, 9, 1);
	c.stamp(bookcase("wide", 2), 11, 1); // the featured shelf
	c.stamp(F.plantTall, 15, 1);
	c.stamp(bookcase("narrow2", 0), 16, 1).stamp(bookcase("narrow", 2), 18, 1).stamp(bookcase("wide", 1), 20, 1);
	c.add(glow(12, 3, GLOWS.lamp));
	// The game stands one book per pinned repo on the featured shelf (M3.11).
	c.add({ type: "books", x: 11, y: 2, w: 3, h: 1 });

	// Aisles on the left: long bookcases seen end-on.
	for (const x of [3, 5, 7]) c.stamp(F.aisleShelf, x, 6);

	// Reading corner on the right: two tables, chairs turned in, a lamp over each.
	for (const y of [5, 8]) {
		c.stamp(F.chairDarkRight, 17, y).stamp(F.chairDarkLeft, 20, y).stamp(F.table, 17, y);
		c.add(glow(18, y, GLOWS.readingLamp));
		c.stamp(SHADE.blob, 17, y + 2);
	}
	c.stamp(F.globe, 22, 4);

	// Solveig's desk facing the door, a runner up the middle.
	c.stamp(F.rug, 11, 5);
	c.stamp(F.receptionDesk, 10, 8);
	c.stamp(F.plant, 2, 10).stamp(F.plant, 23, 10);

	exitDoor(c, r, 12, { toMap: "town", toSpawn: "library_door" });
	const solveig = NPCS.find((n) => n.id === "librarian")!;
	c.add({ type: "npc", id: "librarian", character: "librarian", x: 12, y: 7, facing: "down", name: solveig.name, dialogue: "librarian" });
	c.add({
		type: "sign",
		x: 12,
		y: 3,
		text: "* The featured shelf. Every book on it is one of Thomas's projects, free for anyone to borrow.",
		dialogue: "featured_shelf",
	});
	c.add({ type: "sign", x: 22, y: 4, text: "* A globe. Someone has drawn a tiny circle around Norway." });
	return c;
}
