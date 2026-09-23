// The post office (places: post-office): Liv and how to reach Thomas. Posten-red walls,
// pale tiles. Customers get the noticeboard (his socials), the red box for letters and a
// writing desk; behind the counter, parcel cages and stacks.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, SHADE, windowLight } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function postOffice(): MapCanvas {
	const c = new MapCanvas(18, 12);
	const r = { x: 2, y: 1, w: 14, h: 9 };
	room(c, r, { wall: WALLS.postenRed, floor: FLOORS.paleTiles });

	// Customer side (left): noticeboard with the red box under it, a writing desk.
	// The board hangs low on the wall, clear of the wall-top border.
	c.stamp(F.noticeboard, 2, 2);
	c.stamp(F.redLetterBox, 5, 2);
	c.stamp(F.window, 6, 1);
	c.stamp(F.writingDesk, 2, 6);
	c.add(windowLight(5, 3, 2, 3));

	// Behind the counter (right): parcels waiting to go out.
	c.stamp(F.parcelStack, 8, 2).stamp(F.parcels, 10, 2).stamp(F.parcelStack, 12, 2).stamp(F.parcels, 14, 2);
	// Parcels close off the staff side, from the wall down to the counter.
	c.stamp(F.parcelStack, 6, 3).stamp(F.parcels, 6, 5);
	c.stamp(F.serviceCounter, 8, 5).stamp(F.serviceCounter, 11, 5);
	c.stamp(F.parcelStack, 14, 5);
	c.stamp(SHADE.blob, 8, 7).stamp(SHADE.blob, 11, 7);
	c.add(glow(10, 4, GLOWS.lamp));

	exitDoor(c, r, 6, { toMap: "town", toSpawn: "post_office_door" });
	const liv = NPCS.find((n) => n.id === "postmaster")!;
	c.add({ type: "npc", id: "postmaster", character: "postmaster", x: 10, y: 4, facing: "down", name: liv.name, dialogue: "postmaster" });
	c.add({ type: "sign", x: 3, y: 2, text: "* The noticeboard: GitHub, Bluesky, LinkedIn and more. Liv can point you at any of them." });
	c.add({ type: "sign", x: 5, y: 3, text: "* The red box. For letters to Thomas. Liv has his address." });
	c.add({ type: "sign", x: 3, y: 7, text: "* A writing desk, a pen on a string, and a stack of postcards with the ferry on them." });
	return c;
}
