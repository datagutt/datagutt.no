// Boathouse studio (places: boathouse): Sunniva streams Guac.tv from an old boathouse.
// Left, the boathouse proper: a slip of fjord water running in under the wall, a rowboat
// and fishing gear. Right, the studio: green screen, lights on both sides, a camera on
// her, the stream on the wall monitor and the ON AIR lamp.
import { NPCS } from "../../../game/npcs.ts";
import { variant } from "../../art/autotile.ts";
import { TERRAIN } from "../../art/palette.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";
import { Region } from "../layout.ts";

export function boathouse(): MapCanvas {
	const W = 20;
	const H = 13;
	const c = new MapCanvas(W, H);
	const r = { x: 2, y: 1, w: 16, h: 10 };
	room(c, r, { wall: WALLS.darkPlanks, floor: FLOORS.boards });

	// The slip: fjord water running in through a gap in the bottom wall. Plain water,
	// no shoreline: the floorboards simply end at it.
	const slip = new Region(W, H).rect(2, 5, 4, r.y + r.h - 4);
	slip.each((x, y) => {
		c.put("ground2", x, y, variant(TERRAIN.sea.center, x, y)).block(x, y);
		if (y === r.y + r.h) c.put("above", x, y, null); // the wall is open to the fjord here
	});
	c.stamp(F.rowboatUp, 3, 6);

	// Fishing corner along the back wall.
	c.stamp(F.rodRack, 2, 1).stamp(F.tackleBoxBlue, 4, 3).stamp(F.crate, 6, 7);
	c.stamp(F.tackleBoxYellow, 6, 9);

	// The studio: the Guac desk, and the set with lights turned toward the green screen.
	c.stamp(F.wallMonitor, 8, 1);
	c.stamp(F.onAirLamp, 7, 2);
	c.stamp(F.guacDesk, 8, 5);
	c.stamp(F.greenScreen, 13, 1);
	c.stamp(F.softbox, 11, 2, "flipX").stamp(F.softbox, 16, 2);
	c.stamp(F.armchair, 13, 5);
	c.stamp(F.studioCamera, 14, 8);

	exitDoor(c, r, 10, { toMap: "town", toSpawn: "boathouse_door" });
	const sunniva = NPCS.find((n) => n.id === "streamer")!;
	c.add({ type: "npc", id: "streamer", character: "streamer", x: 15, y: 6, facing: "down", name: sunniva.name, dialogue: "streamer" });
	c.add({ type: "sign", x: 9, y: 6, text: "* The stream preview. Chat is typing faster than anyone can read." });
	c.add({ type: "sign", x: 7, y: 3, text: "* The ON AIR lamp. It is always on. Sunniva says that's the point." });
	c.add({ type: "sign", x: 14, y: 9, text: "* The camera's little red light blinks at you. You are, briefly, content." });
	return c;
}
