// datagutt's house (places: home): Thomas at his desk, the fridge of energy drinks and
// the scale model of Fjord Town (the Portfolio project, i.e. this game).
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE } from "../../art/furniture.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function house(): MapCanvas {
	const c = new MapCanvas(18, 13);
	const r = { x: 2, y: 1, w: 14, h: 10 };
	const floor = room(c, r, { wall: WALLS.woodPanel, floor: FLOORS.oak });

	// Along the back wall: windows, the desk, a bookcase, the fireplace.
	c.stamp(FURNITURE.window, 5, 1).stamp(FURNITURE.window, 10, 1);
	c.stamp(FURNITURE.pcDesk, 3, 2);
	c.stamp(FURNITURE.bookcase, 7, 1);
	c.stamp(FURNITURE.fireplace, 12, 1);
	c.stamp(FURNITURE.bed, 14, 3);
	c.stamp(FURNITURE.fridge, 9, 2);
	// The living corner.
	c.stamp(FURNITURE.rug, 7, 6);
	c.stamp(FURNITURE.sofa, 8, 5);
	c.stamp(FURNITURE.scaleModel, 3, 7);
	c.stamp(FURNITURE.plant, 2, 2).stamp(FURNITURE.plant, 15, 9);
	c.stamp(FURNITURE.doormat, 8, floor.y + floor.h - 2);

	exitDoor(c, r, 9, { toMap: "town", toSpawn: "house_door" });
	const thomas = NPCS.find((n) => n.id === "datagutt")!;
	c.add({ type: "npc", id: "datagutt", character: "datagutt", x: 4, y: 5, facing: "up", name: thomas.name, dialogue: "datagutt" });
	c.add({ type: "sign", x: 3, y: 4, text: "* It's a PC. Several terminals are open. Something is compiling." });
	c.add({ type: "sign", x: 9, y: 3, text: "* The fridge. Energy drinks, top to bottom. Also one lemon, looking lonely." });
	c.add({ type: "sign", x: 3, y: 8, text: "* A scale model of Fjord Town. Tiny you is standing in tiny you's hand. Best not to think about it." });
	return c;
}
