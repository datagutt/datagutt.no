// The farmhouse (places: farm): Ola's home. He works out in the field (the live
// contribution crops, M3.11), so the house holds his harvest ledger. A country kitchen:
// gingham walls, pale planks, a baking oven, a big table with the chairs turned in.
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS, shadowUnder, windowLight } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { mapText } from "../text.ts";

export function farmhouse(): MapCanvas {
	const say = mapText("farmhouse");
	const c = new MapCanvas(18, 11);
	const r = { x: 2, y: 1, w: 14, h: 8 };
	room(c, r, { wall: WALLS.gingham, floor: FLOORS.palePlanks });

	// Back wall: window, counter, the oven, a potted tree.
	c.stamp(F.redCurtainWindow, 2, 1);
	c.stamp(F.kitchenCounter, 5, 2);
	c.stamp(F.bakingOven, 11, 1);
	c.stamp(F.pottedTree, 14, 1);
	c.add(windowLight(2, 3, 3, 3)).add(glow(11, 3, GLOWS.fire));

	// The table, chairs turned in, a round rug by it.
	c.stamp(F.roundRug, 9, 5);
	// Chairs first, so the table's edge draws over them (tiles stack in stamping order).
	c.stamp(F.chairRedRight, 6, 4).stamp(F.chairRedLeft, 8, 4).stamp(F.farmTable, 6, 4);
	shadowUnder(c, F.farmTable, 6, 4);
	// Ledger on the sideboard, vegetables by the door.
	c.stamp(F.sideboard, 2, 6);
	c.stamp(F.crates, 13, 6);

	exitDoor(c, r, 9, { toMap: "town", toSpawn: "farmhouse_door" });
	c.add({ type: "sign", x: 3, y: 7, text: say("harvest-ledger") });
	c.add({ type: "sign", x: 11, y: 3, text: say("oven") });
	c.add({ type: "sign", x: 13, y: 7, text: say("crates") });
	return c;
}
