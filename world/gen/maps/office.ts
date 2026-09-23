// The Nettbureau office (places: office): Ida and Thomas's day job. An open-plan fintech
// floor from LimeZu's Modern Office: pale walls, grey carpet, a row of workstations facing
// the whiteboards (this week's loan numbers going up and to the right), the water cooler
// and a vending machine on the back wall, a lounge corner, and a pile of money nobody
// mentions.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, shadowUnder } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function office(): MapCanvas {
	const c = new MapCanvas(22, 13);
	const r = { x: 2, y: 1, w: 18, h: 10 };
	room(c, r, { wall: WALLS.officeWhite, floor: FLOORS.carpetGrey });

	// Back wall: the two whiteboards, the water cooler and the vending machine.
	c.stamp(F.whiteboardChart, 3, 0).stamp(F.whiteboardPie, 6, 0);
	c.stamp(F.waterCooler, 15, 1).stamp(F.vendingMachine, 16, 1);
	c.stamp(F.lockers, 9, 1).stamp(F.plantTall, 12, 1);

	// The dev team: three workstations in a row, facing the room, chairs behind them.
	// Chairs first, so the desks draw over their lower edge.
	for (const x of [3, 6, 9]) {
		c.stamp(F.officeChair, x + 1, 3).stamp(x === 6 ? F.workstationPale : F.workstation, x, 5);
		shadowUnder(c, F.workstation, x, 5, true);
		c.add(glow(x, 6, GLOWS.screen));
	}

	// Lounge in the bottom right: a sofa, bean bags, and the money.
	c.stamp(F.loungeSofa, 14, 6).stamp(F.beanBagBlue, 13, 7).stamp(F.beanBagYellow, 16, 7);
	c.stamp(F.moneyPile, 16, 3);
	c.stamp(F.plantTall, 2, 8);

	exitDoor(c, r, 10, { toMap: "town", toSpawn: "office_door" });
	const ida = NPCS.find((n) => n.id === "coworker")!;
	c.add({ type: "npc", id: "coworker", character: "coworker", x: 8, y: 9, facing: "up", name: ida.name, dialogue: "coworker" });
	c.add({ type: "sign", x: 4, y: 2, text: "* A whiteboard: \"Loan offers compared this week\". The line goes up and to the right. Someone drew a rocket at the end." });
	c.add({ type: "sign", x: 7, y: 2, text: "* A pie chart. Most of the pie is labelled \"refinancing\". A small slice says \"cake\"." });
	c.add({ type: "sign", x: 17, y: 3, text: "* The vending machine sells one thing: energy drinks. Thomas asked for that." });
	c.add({ type: "sign", x: 17, y: 5, text: "* A pile of money on the floor. Nobody seems worried. Probably from comparing loan offers." });
	return c;
}
