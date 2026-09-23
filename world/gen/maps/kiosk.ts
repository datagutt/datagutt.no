// The kiosk (places: kiosk): Randi and Donate.chat, a Norwegian corner kiosk. Checkered
// shop floor, butter-yellow walls; drinks coolers and "the second fridge" (for Thomas's
// energy drinks), the bun rack and a snack shelf along the back, and Randi behind the
// till, where the tip jar lives.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, SHADE } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function kiosk(): MapCanvas {
	const c = new MapCanvas(14, 11);
	const r = { x: 2, y: 1, w: 10, h: 8 };
	room(c, r, { wall: WALLS.butter, floor: FLOORS.checker });

	// Back wall: coolers, the second fridge, the bun rack, snacks.
	c.stamp(F.drinksCooler, 2, 1).stamp(F.steelFridge, 4, 1);
	c.stamp(F.bakeryRack, 6, 1);
	c.stamp(F.openSign, 8, 1);
	c.stamp(F.productShelf, 10, 1);
	c.add(glow(3, 3, GLOWS.screen)).add(glow(5, 3, GLOWS.screen));

	// The counter across the room: sweets in the display case, the ice cream freezer, the
	// till on the right. Randi stands behind it; customers stay in front.
	c.stamp(F.displayCounter, 2, 5).stamp(F.fridge, 7, 5).stamp(F.checkout, 8, 5);
	c.stamp(F.plant, 11, 5);
	c.stamp(SHADE.blob, 3, 7).stamp(SHADE.blob, 8, 7);

	exitDoor(c, r, 6, { toMap: "town", toSpawn: "kiosk_door" });
	const randi = NPCS.find((n) => n.id === "shopkeeper")!;
	c.add({ type: "npc", id: "shopkeeper", character: "shopkeeper", x: 9, y: 4, facing: "down", name: randi.name, dialogue: "shopkeeper" });
	c.add({ type: "sign", x: 4, y: 6, text: "* A case of pick-and-mix. The sour ones are already gone." });
	c.add({ type: "sign", x: 7, y: 6, text: "* The ice cream freezer. It says Kroneis. It has always said Kroneis." });
	c.add({ type: "sign", x: 10, y: 6, text: "* A tip jar. The label says: Donate.chat accepted. Also Vipps." });
	return c;
}
