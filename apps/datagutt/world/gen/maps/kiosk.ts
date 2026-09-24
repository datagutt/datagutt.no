// The kiosk (places: kiosk): Randi and Donate.chat, a Norwegian corner kiosk. Checkered
// shop floor, butter-yellow walls. Customers walk up to the drinks cooler, "the second
// fridge" (Thomas's energy drinks) and the bun rack along the back wall, and the
// pick-and-mix island in the middle; Randi works the till behind the counter in the
// corner, closed off by the Kroneis freezer.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS, shadowUnder } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { mapText } from "../text.ts";

export function kiosk(): MapCanvas {
	const say = mapText("kiosk");
	const c = new MapCanvas(18, 12);
	const r = { x: 2, y: 1, w: 14, h: 9 };
	room(c, r, { wall: WALLS.butter, floor: FLOORS.checker });

	// Customer side of the back wall: cooler, the second fridge, the bun rack.
	c.stamp(F.drinksCooler, 2, 1).stamp(F.steelFridge, 4, 1);
	c.stamp(F.bakeryRack, 7, 1);
	c.add(glow(3, 3, GLOWS.screen)).add(glow(5, 3, GLOWS.screen));
	// The pick-and-mix island.
	c.stamp(F.displayCounter, 3, 6);
	shadowUnder(c, F.displayCounter, 3, 6, true);

	// Staff corner: snacks and the open sign behind the till, the freezer closing it off.
	c.stamp(F.openSign, 12, 1).stamp(F.productShelf, 14, 1);
	c.stamp(F.fridge, 10, 3);
	c.stamp(F.checkout, 11, 5).stamp(F.fridge, 14, 5);
	shadowUnder(c, F.checkout, 11, 5);
	c.add(glow(12, 4, GLOWS.lamp));

	exitDoor(c, r, 8, { toMap: "town", toSpawn: "kiosk_door" });
	const randi = NPCS.find((n) => n.id === "shopkeeper")!;
	c.add({ type: "npc", id: "shopkeeper", character: "shopkeeper", x: 12, y: 4, facing: "down", name: randi.name, dialogue: "shopkeeper" });
	c.add({ type: "sign", x: 3, y: 3, text: say("drinks-cooler") });
	c.add({ type: "sign", x: 5, y: 3, text: say("second-fridge") });
	c.add({ type: "sign", x: 8, y: 2, text: say("skolebrod") });
	c.add({ type: "sign", x: 5, y: 7, text: say("pick-and-mix") });
	c.add({ type: "sign", x: 10, y: 4, text: say("ice-cream-freezer") });
	c.add({ type: "sign", x: 13, y: 6, text: say("tip-jar") });
	return c;
}
