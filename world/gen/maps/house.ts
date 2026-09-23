// datagutt's house (places: home), two floors with their own look.
//
// Downstairs, a warm wood-panelled cabin room: kitchen corner with a dining table, a TV
// lounge (two sofas turned toward the TV), the wood stove, stairs up, and a scale model
// of the house itself by the door.
// Upstairs, cooler and more personal: Thomas at one long desk with three computers, the
// mini-fridge of energy drinks within reach, his bed, a dresser and the stairwell down.
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, shadowUnder, windowLight } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function house(): MapCanvas {
	const c = new MapCanvas(20, 14);
	const r = { x: 2, y: 1, w: 16, h: 11 };
	const floor = room(c, r, { wall: WALLS.woodPanel, floor: FLOORS.oak });

	// Back wall, left to right: stove and counter, window, TV, wood stove, stairs.
	c.stamp(F.stove, 2, 2).stamp(F.counter, 4, 2);
	c.stamp(F.window, 7, 1);
	c.stamp(F.tvCabinet, 9, 2).stamp(F.tv, 9, 1);
	c.stamp(F.fireplace, 12, 1);
	c.stamp(F.stairsUp, 15, 1);

	// Dining: the chairs face the table from either side.
	// Chairs first, so the table's edge draws over them (tiles stack in stamping order).
	c.stamp(F.chairFacingRight, 3, 6).stamp(F.chairFacingLeft, 6, 6).stamp(F.table, 3, 6);
	// TV lounge: sofas on both sides of the rug, turned toward the TV.
	c.stamp(F.rug, 9, 6);
	c.stamp(F.sofaFacingRight, 8, 5).stamp(F.sofaFacingLeft, 12, 5);
	// By the door: the scale model, plants, the doormat. Column 14 stays clear up to the stairs.
	c.stamp(F.scaleModel, 15, 8);
	c.stamp(F.plant, 17, 10).stamp(F.palm, 2, 9);
	c.stamp(F.doormat, 9, floor.y + floor.h - 2);

	// Light: daylight from the window, the fire, the TV. Shade under the table and sofas.
	c.add(windowLight(7, 3)).add(glow(12, 3, GLOWS.fire)).add(glow(9, 3, GLOWS.screen));
	shadowUnder(c, F.table, 3, 6, true);
	shadowUnder(c, F.sofaFacingRight, 8, 5);
	shadowUnder(c, F.sofaFacingLeft, 12, 5);

	// The second step up the stairs is the door upstairs.
	c.block(16, 2, false).add({ type: "door", x: 16, y: 2, toMap: "house-up", toSpawn: "stairs" });
	c.add({ type: "spawn", id: "stairs", x: 16, y: 5, facing: "down" });

	exitDoor(c, r, 10, { toMap: "town", toSpawn: "house_door" });
	c.add({ type: "sign", x: 15, y: 9, text: "* A scale model of this very house. There's a tiny you inside it, reading a tiny sign. Best not to think about it." });
	c.add({ type: "sign", x: 2, y: 3, text: "* The stove. Spotless. It has never been used, and it knows it." });
	c.add({ type: "sign", x: 9, y: 3, text: "* The TV is paused on a speedrun. Someone is about to clip through a wall." });
	return c;
}

export function houseUpstairs(): MapCanvas {
	const c = new MapCanvas(20, 13);
	const r = { x: 2, y: 1, w: 16, h: 10 };
	room(c, r, { wall: WALLS.blueGrey, floor: FLOORS.darkWood });

	// Back wall: window, the long desk, the mini-fridge, a shelf and a tall plant.
	c.stamp(F.curtainWindow, 2, 1);
	c.stamp(F.deskTriple, 5, 2);
	c.stamp(F.fridge, 9, 2);
	c.stamp(F.shelf, 10, 1);
	c.stamp(F.plantTall, 12, 1);
	// The bed along the left wall, a rug in the middle, a dresser on the right.
	c.stamp(F.bedHeadboard, 2, 6);
	c.stamp(F.rug, 7, 7);
	c.stamp(F.dresser, 16, 8);

	// Light: the three screens, daylight through the curtains. Shade under the bed.
	c.add(glow(5, 4, GLOWS.screen)).add(glow(6, 4, GLOWS.screen)).add(glow(7, 4, GLOWS.screen));
	c.add(windowLight(2, 3, 3, 3));
	shadowUnder(c, F.bedHeadboard, 2, 6, true);

	// Stairs down in the back-right corner, railed on three sides, open at the bottom.
	c.stamp(F.stairsDown, 15, 2).stamp(F.stairwellRail, 15, 2);
	c.stamp(F.stairwellPostLeft, 15, 4).stamp(F.stairwellPostRight, 17, 4);
	c.put("above", 16, 3, null); // the rail sheet has loose stubs inside the well
	c.add({ type: "door", x: 16, y: 4, toMap: "house", toSpawn: "stairs" });
	c.add({ type: "spawn", id: "stairs", x: 16, y: 6, facing: "down" });

	// Thomas is live (game/live/datagutt.ts): at the desk while coding or gaming, in bed
	// when offline, out in town otherwise.
	c.add({ type: "spot", id: "datagutt-desk", x: 6, y: 5, facing: "up" });
	c.add({ type: "spot", id: "datagutt-bed", x: 3, y: 7, facing: "down" });
	c.add({ type: "sign", x: 7, y: 4, text: "* Three computers. Several terminals are open. Something is compiling." });
	c.add({ type: "sign", x: 9, y: 3, text: "* A mini-fridge. Energy drinks, top to bottom. Also one lemon, looking lonely." });
	return c;
}
