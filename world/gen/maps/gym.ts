// The gym (places: gym): Tor, a gym bro, in the old log cabin. "Lift the whole stack":
// one piece of kit per skill category in his dialogue (trainer.ink): languages
// (dumbbells), frameworks (barbells), cloud and DevOps (the treadmill, endurance),
// everyday tools (warm-up weights), the heavy rack (video and streaming) and the front
// desk (payments, memberships). Everything comes from the one gym sheet so it matches.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, SHADE } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function gym(): MapCanvas {
	const c = new MapCanvas(18, 12);
	const r = { x: 2, y: 1, w: 14, h: 9 };
	room(c, r, { wall: WALLS.mint, floor: FLOORS.rubberGrid });

	// Mirror wall with the dumbbells and barbells in front of it.
	c.stamp(F.mirrorWall, 5, 1).stamp(F.mirrorWall, 8, 1);
	c.stamp(F.dumbbellRack, 2, 2); // languages
	c.stamp(F.barbellRack, 6, 3); // frameworks
	c.stamp(F.weightBench, 11, 1);
	c.stamp(F.punchingBag, 14, 1);

	// The floor: a mat for free weights, the treadmill, the heavy rack.
	c.stamp(F.gymMat, 2, 5);
	c.stamp(F.warmupRack, 3, 6); // everyday tools
	c.stamp(F.treadmill, 14, 5); // cloud and DevOps
	c.stamp(F.powerRack, 11, 5).stamp(F.weightPlates, 9, 7); // the heavy rack
	c.stamp(SHADE.blob, 10, 9);

	// Front desk by the door (payments), with the lights on over it.
	c.stamp(F.frontDesk, 3, 8);
	c.add(glow(5, 8, GLOWS.lamp));

	exitDoor(c, r, 8, { toMap: "town", toSpawn: "gym_door" });
	const tor = NPCS.find((n) => n.id === "trainer")!;
	c.add({ type: "npc", id: "trainer", character: "trainer", x: 8, y: 6, facing: "down", name: tor.name, dialogue: "trainer" });
	c.add({ type: "sign", x: 3, y: 3, text: "* The languages rack. Mostly TypeScript-weight dumbbells." });
	c.add({ type: "sign", x: 7, y: 4, text: "* The frameworks rack. Every bar is loaded differently." });
	c.add({ type: "sign", x: 14, y: 8, text: "* The treadmill: cloud and DevOps. It never stops running." });
	c.add({ type: "sign", x: 4, y: 7, text: "* Warm-up weights: everyday tools. Nobody skips them here." });
	c.add({ type: "sign", x: 11, y: 8, text: "* The heavy rack: video and streaming. The bar is bending slightly." });
	c.add({ type: "sign", x: 5, y: 8, text: "* The front desk. Memberships, payments, a bowl of protein bars." });
	return c;
}
