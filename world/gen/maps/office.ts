// The Nettbureau office (places: office): Ida and Thomas's day job. About sixty people
// work here, so it is one big open floor from LimeZu's Modern Office, startup style:
// departments marked by their carpet and a glass wall across the middle, whiteboards and
// a neon sign on the back wall, a kitchen that stocks energy drinks, a lounge with bean
// bags. Ida welcomes visitors at reception; six coworkers have a line each
// (game/dialogue/ink/office.ink). The rest are at lunch.
//
//   top:    Dev (x 3-17) | Product & design (x 20-29) | Kitchen (x 31-39)
//   glass wall (y 13-14), with openings
//   bottom: Customer service (x 3-15) | reception by the door | Growth (x 23-29) | Lounge
import { NPCS } from "../../../game/npcs.ts";
import type { MapObject } from "../../../game/world/objects.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, shadowUnder } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, floorPatch, FLOORS, room, WALLS } from "../interior.ts";

/** A row of workstations facing the room, a chair pulled up behind each, screens lit. */
function desks(c: MapCanvas, xs: number[], y: number, pale = false) {
	for (const x of xs) {
		// Chairs first, so the desks draw over their lower edge.
		c.stamp(F.officeChair, x + 1, y - 2).stamp(pale ? F.workstationPale : F.workstation, x, y);
		shadowUnder(c, F.workstation, x, y, true);
		c.add(glow(x, y + 1, GLOWS.screen));
	}
}

const extra = (id: string, name: string, x: number, y: number, facing: "up" | "down" | "left" | "right"): MapObject => ({
	type: "npc",
	id,
	character: id,
	x,
	y,
	facing,
	name,
	dialogue: id,
});

export function office(): MapCanvas {
	const c = new MapCanvas(42, 29);
	const r = { x: 2, y: 1, w: 38, h: 26 };
	room(c, r, { wall: WALLS.officeWhite, floor: FLOORS.carpetGrey });
	// Department floors.
	floorPatch(c, { x: 20, y: 3, w: 10, h: 10 }, FLOORS.carpetTan);
	floorPatch(c, { x: 31, y: 3, w: 9, h: 10 }, FLOORS.tiles);
	floorPatch(c, { x: 23, y: 15, w: 7, h: 12 }, FLOORS.carpetDark);
	floorPatch(c, { x: 31, y: 15, w: 9, h: 12 }, FLOORS.carpetRed);

	// Back wall: dev's whiteboards, the neon sign over the middle, product's charts, the
	// kitchen's fridge, water cooler and vending machines.
	c.stamp(F.whiteboardChart, 3, 0).stamp(F.whiteboard, 6, 0).stamp(F.serverRack, 13, 1).stamp(F.plantTall, 16, 1);
	c.stamp(F.posterFaces, 18, 0);
	c.add(glow(18, 1, GLOWS.neon));
	c.stamp(F.whiteboardPie, 22, 0).stamp(F.whiteboard, 25, 0).stamp(F.plantTall, 28, 1);
	c.stamp(F.fridge, 31, 1).stamp(F.waterCooler, 32, 1).stamp(F.vendingMachine, 33, 1).stamp(F.vendingMachine, 35, 1);
	c.stamp(F.counter, 37, 2);

	// Dev and product: two rows of workstations each.
	desks(c, [3, 6, 9, 12, 15], 5);
	desks(c, [3, 6, 9, 12, 15], 9);
	desks(c, [21, 24, 27], 5, true);
	desks(c, [21, 24, 27], 9, true);
	// Kitchen: a table for lunch, chairs turned in.
	c.stamp(F.chairFacingRight, 32, 7).stamp(F.chairFacingLeft, 37, 7).stamp(F.table, 33, 6);
	shadowUnder(c, F.table, 33, 6, true);

	// The glass wall across the floor, with ways through.
	for (let x = 2; x < 40; x += 2) if (![10, 18, 20, 30].includes(x)) c.stamp(F.glassWall, x, 12);

	// Customer service and growth: rows of desks.
	desks(c, [3, 6, 9, 12], 17);
	desks(c, [3, 6, 9, 12], 22);
	desks(c, [23, 26], 17, true);
	desks(c, [23, 26], 22, true);
	c.stamp(F.moneyPile, 28, 24);
	// Lounge: sofa, bean bags, plants.
	c.stamp(F.loungeSofaWide, 33, 17).stamp(F.loungeSofa, 36, 17).stamp(F.beanBagBlue, 32, 21).stamp(F.beanBagYellow, 37, 21);
	c.stamp(F.plantTall, 38, 23).stamp(F.plantTall, 31, 23);
	// Reception by the door.
	c.stamp(F.deskRun, 15, 22).stamp(F.deskCorner, 17, 22).stamp(F.plantTall, 22, 23);
	c.add(glow(16, 22, GLOWS.lamp));

	exitDoor(c, r, 20, { toMap: "town", toSpawn: "office_door" });
	const ida = NPCS.find((n) => n.id === "coworker")!;
	c.add({ type: "npc", id: "coworker", character: "coworker", x: 16, y: 21, facing: "down", name: ida.name, dialogue: "coworker" });
	c.add(extra("officeDev", "Magnus", 8, 8, "up"));
	c.add(extra("officeDesigner", "Sara", 26, 3, "up"));
	c.add(extra("officeData", "Emil", 29, 8, "left"));
	c.add(extra("officeSupport", "Jonas", 11, 20, "left"));
	c.add(extra("officeGrowth", "Nora", 25, 25, "up"));
	c.add(extra("officeFinance", "Aisha", 30, 25, "left"));

	c.add({ type: "sign", x: 4, y: 2, text: "* A whiteboard: \"Loan offers compared this week\". The line goes up and to the right. Someone drew a rocket at the end." });
	c.add({ type: "sign", x: 7, y: 2, text: "* A whiteboard full of boxes and arrows. In the corner: \"do NOT erase (Thomas)\"." });
	c.add({ type: "sign", x: 19, y: 2, text: "* A neon-lit poster of smiling pixel faces. Across the bottom: \"Ship it. Then ship it again.\"" });
	c.add({ type: "sign", x: 23, y: 2, text: "* A pie chart. Most of the pie is labelled \"refinancing\". A small slice says \"cake\"." });
	c.add({ type: "sign", x: 34, y: 3, text: "* The vending machine sells one thing: energy drinks. Thomas asked for that." });
	c.add({ type: "sign", x: 29, y: 25, text: "* A pile of money on the floor. Nobody seems worried." });
	return c;
}
