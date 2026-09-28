// The post office (places: post-office): Liv and how to reach Thomas. Posten-red walls,
// pale tiles. Customers get the noticeboard (his socials), the red box for letters and a
// writing desk; behind the counter, parcel cages and stacks.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS, shadowUnder, windowLight } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { mapText } from "../text.ts";

export function postOffice(): MapCanvas {
	const say = mapText("post-office");
	const c = new MapCanvas(20, 13);
	const r = { x: 2, y: 1, w: 16, h: 10 };
	room(c, r, { wall: WALLS.postenRed, floor: FLOORS.paleTiles });

	// Customer side (left): noticeboard with the red box under it, a writing desk.
	// The board hangs low on the wall, clear of the wall-top border.
	c.stamp(F.noticeboard, 2, 2);
	c.stamp(F.redLetterBox, 5, 2);
	c.stamp(F.window, 6, 1);
	c.stamp(F.writingDesk, 2, 7);
	c.add(windowLight(5, 3, 2, 3));

	// Behind the counter (right): parcels along the wall, a stack closing each end.
	c.stamp(F.parcelStack, 10, 2).stamp(F.parcels, 12, 2).stamp(F.parcelStack, 14, 2).stamp(F.parcels, 16, 2);
	c.stamp(F.parcels, 8, 2).stamp(F.parcelStack, 8, 4).stamp(F.parcels, 8, 6);
	c.stamp(F.serviceCounter, 10, 6).stamp(F.serviceCounter, 13, 6);
	c.stamp(F.parcelStack, 16, 6);
	shadowUnder(c, F.serviceCounter, 10, 6, true);
	shadowUnder(c, F.serviceCounter, 13, 6, true);
	c.add(glow(12, 5, GLOWS.lamp));

	exitDoor(c, r, 7, { toMap: "town", toSpawn: "post_office_door" });
	const liv = NPCS.find((n) => n.id === "postmaster")!;
	c.add({ type: "npc", id: "postmaster", character: "postmaster", x: 12, y: 5, facing: "down", name: liv.name, dialogue: "postmaster" });
	c.add({ type: "sign", x: 3, y: 2, text: say("noticeboard") });
	c.add({ type: "sign", x: 5, y: 3, text: say("postbox") });
	c.add({ type: "sign", x: 3, y: 7, text: say("writing-desk") });
	return c;
}
