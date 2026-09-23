// The town hall (places: town-hall): Bjørn and Indre Østfold Data IKS. The council hall:
// burgundy walls, marble floor, a stage with the lectern between pillars, portraits of
// past mayors, public benches either side of the red carpet. Bjørn waits by the locked
// basement door; the basement server room comes later (it needs server rack art).
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, shadowUnder } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, FLOORS, room, WALLS } from "../interior.ts";

export function townHall(): MapCanvas {
	const c = new MapCanvas(24, 14);
	const r = { x: 2, y: 1, w: 20, h: 11 };
	room(c, r, { wall: WALLS.burgundy, floor: FLOORS.marble });

	// Back wall: portraits, the stage and lectern between pillars, the basement door.
	c.stamp(F.monaLisa, 3, 1).stamp(F.portraitWave, 6, 1);
	c.stamp(F.pillar, 8, 1).stamp(F.pillar, 15, 1);
	c.stamp(F.stage, 9, 2).stamp(F.lectern, 11, 2);
	c.stamp(F.portraitStars, 16, 1);
	c.stamp(F.plainDoor, 19, 1);
	c.add(glow(11, 3, GLOWS.lamp));

	// The public: benches in rows either side of the carpet, vases along the walls.
	for (let y = 4; y <= 9; y += 2) {
		// Mirrored top to bottom, so the seats face the stage.
		for (let n = 0; n < 2; n++) c.stamp(F.museumBench, 4 + n * 3, y, "flipY").stamp(F.museumBench, 14 + n * 3, y, "flipY");
	}
	for (let y = 5; y <= 10; y += 2) c.stamp(F.redRug, 11, y);
	c.stamp(F.vasePedestal, 2, 8).stamp(F.vasePedestal, 20, 8);
	shadowUnder(c, F.stage, 9, 2);

	exitDoor(c, r, 12, { toMap: "town", toSpawn: "town_hall_door" });
	const bjorn = NPCS.find((n) => n.id === "sysadmin")!;
	c.add({ type: "npc", id: "sysadmin", character: "sysadmin", x: 18, y: 3, facing: "down", name: bjorn.name, dialogue: "sysadmin" });
	c.add({ type: "sign", x: 19, y: 2, text: "* BASEMENT. SERVERS. AUTHORISED PERSONNEL ONLY. The door is humming, and cold to the touch." });
	c.add({ type: "sign", x: 4, y: 2, text: "* A past mayor. She is smiling. Nobody on the council knows why." });
	c.add({ type: "sign", x: 11, y: 3, text: "* The lectern. A note taped to it says: KEEP IT SHORT." });
	return c;
}
