// The gym (places: gym): Tor, a gym bro, in the old log cabin. "Lift the whole stack":
// one piece of kit per skill category in his dialogue (trainer.ink): languages
// (dumbbells), frameworks (barbells), cloud and DevOps (the treadmill, endurance),
// everyday tools (warm-up weights), the heavy rack (video and streaming) and the front
// desk (payments, memberships). Everything comes from the one gym sheet so it matches.
// Laid out with two-tile aisles so there is room to move between the kit.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS, shadowUnder } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";

export function gym(): MapCanvas {
	const c = new MapCanvas(20, 13);
	const r = { x: 2, y: 1, w: 16, h: 10 };
	room(c, r, { wall: WALLS.mint, floor: FLOORS.rubberGrid });

	// The mirror wall: dumbbells at one end, the bench and the bag at the other.
	c.stamp(F.mirrorWall, 5, 1).stamp(F.mirrorWall, 8, 1);
	c.stamp(F.dumbbellRack, 2, 2); // languages
	c.stamp(F.weightBench, 12, 1).stamp(F.punchingBag, 16, 1);
	// Barbells out on the floor in front of the mirrors.
	c.stamp(F.barbellRack, 6, 4); // frameworks

	// Free weights on the mat, the heavy rack, the treadmill.
	c.stamp(F.gymMat, 2, 5).stamp(F.warmupRack, 3, 6); // everyday tools
	c.stamp(F.benchPress, 11, 6).stamp(F.weightPlates, 13, 9); // the heavy rack
	c.stamp(F.treadmill, 15, 5); // cloud and DevOps
	shadowUnder(c, F.benchPress, 11, 6);

	// Front desk by the door (payments), with a light over it.
	c.stamp(F.frontDesk, 3, 9);
	c.add(glow(5, 9, GLOWS.lamp));

	exitDoor(c, r, 10, { toMap: "town", toSpawn: "gym_door" });
	const tor = NPCS.find((n) => n.id === "trainer")!;
	c.add({ type: "npc", id: "trainer", character: "trainer", x: 9, y: 7, facing: "down", name: tor.name, dialogue: "trainer" });
	c.add({ type: "sign", x: 3, y: 3, text: "* The languages rack. Mostly TypeScript-weight dumbbells." });
	c.add({ type: "sign", x: 7, y: 5, text: "* The frameworks rack. Every bar is loaded differently." });
	c.add({ type: "sign", x: 16, y: 7, text: "* The treadmill: cloud and DevOps. It never stops running." });
	c.add({ type: "sign", x: 4, y: 7, text: "* Warm-up weights: everyday tools. Nobody skips them here." });
	c.add({ type: "sign", x: 12, y: 7, text: "* The heavy rack: video and streaming. The bar is bending slightly." });
	c.add({ type: "sign", x: 6, y: 10, text: "* The front desk. Memberships, payments, a bowl of protein bars." });
	return c;
}
