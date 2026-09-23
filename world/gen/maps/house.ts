// datagutt's house (places: home), two floors. Downstairs: living room, kitchen and the
// scale model of Fjord Town (the Portfolio project, i.e. this game). Upstairs: Thomas at
// his desks, the mini-fridge of energy drinks and his bed.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE } from "../../art/furniture.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function house(): MapCanvas {
	const c = new MapCanvas(18, 13);
	const r = { x: 2, y: 1, w: 14, h: 10 };
	const floor = room(c, r, { wall: WALLS.woodPanel, floor: FLOORS.oak });

	// Kitchen corner.
	c.stamp(FURNITURE.stove, 2, 2);
	c.stamp(FURNITURE.table, 3, 5).stamp(FURNITURE.chair, 3, 5).stamp(FURNITURE.chair, 6, 5);
	// Living room.
	c.stamp(FURNITURE.bookcase, 5, 1);
	c.stamp(FURNITURE.fireplace, 8, 1);
	c.stamp(FURNITURE.window, 10, 1);
	c.stamp(FURNITURE.rug, 7, 6);
	c.stamp(FURNITURE.sofa, 8, 5);
	c.stamp(FURNITURE.scaleModel, 12, 7);
	c.stamp(FURNITURE.plant, 2, 9).stamp(FURNITURE.plant, 15, 9);
	c.stamp(FURNITURE.doormat, 8, floor.y + floor.h - 2);

	// Stairs up in the back-right corner: the second step is the door upstairs.
	c.stamp(FURNITURE.stairsUp, 13, 1);
	c.block(14, 2, false).add({ type: "door", x: 14, y: 2, toMap: "house-up", toSpawn: "stairs" });
	c.add({ type: "spawn", id: "stairs", x: 14, y: 4, facing: "down" });

	exitDoor(c, r, 9, { toMap: "town", toSpawn: "house_door" });
	c.add({ type: "sign", x: 12, y: 8, text: "* A scale model of Fjord Town. Tiny you is standing in it. Best not to think about it." });
	c.add({ type: "sign", x: 2, y: 3, text: "* The stove. Spotless. It has never been used, and it knows it." });
	return c;
}

export function houseUpstairs(): MapCanvas {
	const c = new MapCanvas(16, 12);
	const r = { x: 2, y: 1, w: 12, h: 9 };
	room(c, r, { wall: WALLS.woodPanel, floor: FLOORS.oak });

	// The battlestation: two desks, the mini-fridge within arm's reach.
	c.stamp(FURNITURE.pcDesk, 4, 2).stamp(FURNITURE.pcDesk, 6, 2);
	c.stamp(FURNITURE.fridge, 8, 2);
	c.stamp(FURNITURE.window, 2, 1);
	c.stamp(FURNITURE.bookcase, 9, 1);
	c.stamp(FURNITURE.bed, 2, 5);
	c.stamp(FURNITURE.rug, 5, 6);
	c.stamp(FURNITURE.plant, 13, 8);

	// Stairs down in the back-right corner, railed on three sides, open at the bottom.
	c.stamp(FURNITURE.stairsDown, 11, 3).stamp(FURNITURE.stairwellRail, 11, 3);
	c.put("above", 12, 4, null); // the rail sheet has loose stubs inside the well
	c.add({ type: "door", x: 12, y: 4, toMap: "house", toSpawn: "stairs" });
	c.add({ type: "spawn", id: "stairs", x: 12, y: 6, facing: "down" });

	const thomas = NPCS.find((n) => n.id === "datagutt")!;
	c.add({ type: "npc", id: "datagutt", character: "datagutt", x: 5, y: 5, facing: "up", name: thomas.name, dialogue: "datagutt" });
	c.add({ type: "sign", x: 7, y: 4, text: "* It's a PC. Several terminals are open. Something is compiling." });
	c.add({ type: "sign", x: 8, y: 3, text: "* A mini-fridge. Energy drinks, top to bottom. Also one lemon, looking lonely." });
	return c;
}
