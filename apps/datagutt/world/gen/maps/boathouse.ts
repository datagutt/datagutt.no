// Boathouse studio (places: boathouse): Sunniva streams Guac.tv from an old boathouse.
// Left, the boathouse proper: a slip of fjord water running in under the wall, a rowboat
// and fishing gear. Right, the studio: green screen, lights on both sides, a camera on
// her, the stream on the wall monitor and the ON AIR lamp.
import { NPCS } from "../../../game/npcs.ts";
import { variant } from "@datagutt/kai-worldgen/autotile";
import { DOCK_TRIM, TERRAIN } from "@datagutt/kai-limezu/palette";
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS } from "@datagutt/kai-limezu/lighting";
import { FLIP, MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { Region } from "@datagutt/kai-worldgen/layout";
import { mapText } from "../text.ts";

export function boathouse(): MapCanvas {
	const say = mapText("boathouse");
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
	// Dock trim: the floor's plank lip over the water's top edge, posts along its side.
	for (let x = 2; x <= 5; x++) c.put("below", x, 5, x === 2 ? DOCK_TRIM.lipLeft : DOCK_TRIM.lip);
	// Down the side, the same lip turned a quarter clockwise (it is flat, so rotating is safe).
	for (let y = 6; y <= 10; y++) c.put("decal", 5, y, { ...DOCK_TRIM.lip, flip: FLIP.D | FLIP.H });
	for (const y of [6, 9]) c.put("below", 5, y, DOCK_TRIM.postRight[0]).put("below", 5, y + 1, DOCK_TRIM.postRight[1]);
	c.stamp(F.rowboatUp, 3, 6);

	// Fishing corner along the back wall.
	c.stamp(F.rodRack, 2, 1).stamp(F.tackleBoxBlue, 4, 3);
	// Spare gear stacked by the far wall, clear of the walkway along the slip.
	c.stamp(F.crate, 16, 7).stamp(F.tackleBoxYellow, 16, 9);

	// The studio: the Guac desk, and the set with lights turned toward the green screen.
	c.stamp(F.wallMonitor, 8, 1);
	c.stamp(F.onAirLamp, 7, 2);
	c.stamp(F.guacDesk, 8, 5);
	c.stamp(F.greenScreen, 13, 1);
	c.stamp(F.softbox, 11, 2, "flipX").stamp(F.softbox, 16, 2);
	c.stamp(F.armchair, 13, 5);
	c.stamp(F.studioCamera, 14, 8);

	// Light: the set is lit from both sides. (The dock lip draws its own shadow on the water.)
	c.add(glow(7, 2, GLOWS.onAir)).add(glow(9, 2, GLOWS.screen));
	c.add(glow(12, 4, GLOWS.studio)).add(glow(16, 4, GLOWS.studio)).add(glow(14, 4, GLOWS.greenSpill));

	exitDoor(c, r, 10, { toMap: "town", toSpawn: "boathouse_door" });
	const sunniva = NPCS.find((n) => n.id === "streamer")!;
	c.add({ type: "npc", id: "streamer", character: "streamer", x: 15, y: 6, facing: "down", name: sunniva.name, dialogue: "streamer" });
	c.add({ type: "sign", x: 9, y: 6, text: say("stream-preview") });
	c.add({ type: "sign", x: 7, y: 2, text: say("on-air-lamp") });
	c.add({ type: "sign", x: 14, y: 9, text: say("camera") });
	return c;
}
