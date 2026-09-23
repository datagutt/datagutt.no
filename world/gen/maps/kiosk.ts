// The kiosk (places: kiosk): Randi and Donate.chat, a Norwegian corner kiosk. Checkered
// shop floor, butter-yellow walls. Customers walk up to the drinks cooler, "the second
// fridge" (Thomas's energy drinks) and the bun rack along the back wall, and the
// pick-and-mix island in the middle; Randi works the till behind the counter in the
// corner, closed off by the Kroneis freezer.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, SHADE } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function kiosk(): MapCanvas {
	const c = new MapCanvas(18, 12);
	const r = { x: 2, y: 1, w: 14, h: 9 };
	room(c, r, { wall: WALLS.butter, floor: FLOORS.checker });

	// Customer side of the back wall: cooler, the second fridge, the bun rack.
	c.stamp(F.drinksCooler, 2, 1).stamp(F.steelFridge, 4, 1);
	c.stamp(F.bakeryRack, 7, 1);
	c.add(glow(3, 3, GLOWS.screen)).add(glow(5, 3, GLOWS.screen));
	// The pick-and-mix island.
	c.stamp(F.displayCounter, 3, 6);
	c.stamp(SHADE.blob, 4, 8);

	// Staff corner: snacks and the open sign behind the till, the freezer closing it off.
	c.stamp(F.openSign, 12, 1).stamp(F.productShelf, 14, 1);
	c.stamp(F.fridge, 10, 3);
	c.stamp(F.checkout, 11, 5).stamp(F.fridge, 14, 5);
	c.stamp(SHADE.blob, 11, 7);
	c.add(glow(12, 4, GLOWS.lamp));

	exitDoor(c, r, 8, { toMap: "town", toSpawn: "kiosk_door" });
	const randi = NPCS.find((n) => n.id === "shopkeeper")!;
	c.add({ type: "npc", id: "shopkeeper", character: "shopkeeper", x: 12, y: 4, facing: "down", name: randi.name, dialogue: "shopkeeper" });
	c.add({ type: "sign", x: 3, y: 3, text: "* The drinks cooler. Brus, juice, and water nobody buys." });
	c.add({ type: "sign", x: 5, y: 3, text: "* The second fridge. It is entirely energy drinks. There's a label on it: THOMAS." });
	c.add({ type: "sign", x: 8, y: 2, text: "* Skolebrød and cinnamon buns. Randi says the waffles are \"coming\"." });
	c.add({ type: "sign", x: 5, y: 7, text: "* A case of pick-and-mix. The sour ones are already gone." });
	c.add({ type: "sign", x: 10, y: 4, text: "* The ice cream freezer. It says Kroneis. It has always said Kroneis." });
	c.add({ type: "sign", x: 13, y: 6, text: "* A tip jar. The label says: Donate.chat accepted. Also Vipps." });
	return c;
}
