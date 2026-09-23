// The smithy (places: smithy): Tor and the tech stack, "one rack per skill category".
// Rough plank walls, a dark stone floor, the forge in the middle of the back wall and a rack or
// chest for each category in the dialogue (smith.ink): languages, frameworks, cloud and
// DevOps, everyday tools, the heavy rack (video and streaming) and the till (payments).
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, SHADE } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function smithy(): MapCanvas {
	const c = new MapCanvas(18, 12);
	const r = { x: 2, y: 1, w: 14, h: 9 };
	room(c, r, { wall: WALLS.rusticPlanks, floor: FLOORS.darkStone });

	// Back wall: racks either side of the forge.
	c.stamp(F.rodRack, 2, 1); // languages
	c.stamp(F.toolChestShut, 5, 2); // frameworks
	c.stamp(F.forge, 8, 1);
	c.add(glow(8, 3, GLOWS.fire)).add(glow(9, 3, GLOWS.fire));
	c.stamp(F.rebar, 11, 1); // cloud and DevOps
	c.stamp(F.toolChest, 13, 1); // everyday tools
	// The heavy rack stands on its own; the till is by the door.
	c.stamp(F.dumbbellRack, 13, 5).stamp(F.weightPlates, 13, 7);
	c.stamp(F.timber, 2, 5);
	c.stamp(F.smallCabinet, 9, 7);
	c.stamp(SHADE.blob, 13, 8).stamp(SHADE.blob, 1, 8);

	exitDoor(c, r, 7, { toMap: "town", toSpawn: "smithy_door" });
	const tor = NPCS.find((n) => n.id === "smith")!;
	c.add({ type: "npc", id: "smith", character: "smith", x: 9, y: 5, facing: "down", name: tor.name, dialogue: "smith" });
	c.add({ type: "sign", x: 3, y: 3, text: "* The languages rack. Ask Tor what's on it." });
	c.add({ type: "sign", x: 5, y: 3, text: "* The frameworks chest. Every tool in it has a favourite job." });
	c.add({ type: "sign", x: 12, y: 3, text: "* The cloud and DevOps rack. It hums slightly." });
	c.add({ type: "sign", x: 14, y: 3, text: "* A chest of everyday tools, worn smooth from use." });
	c.add({ type: "sign", x: 13, y: 6, text: "* The heavy rack: video and streaming gear. It weighs more than the ferry." });
	c.add({ type: "sign", x: 10, y: 8, text: "* The till. Tor takes payments. Thomas built a few ways to do that." });
	return c;
}
