// The town hall (places: town-hall): Bjørn and Indre Østfold Data IKS. The council hall:
// burgundy walls, marble floor, a stage with the lectern between pillars, portraits of
// past mayors, public benches either side of the red carpet. The door by the stage goes
// down to the basement: the municipal IT department, where Bjørn still keeps the servers
// and, mostly, the printers running.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "../../art/furniture.ts";
import { glow, GLOWS, shadowUnder } from "../../art/lighting.ts";
import { MapCanvas } from "../canvas.ts";
import { exitDoor, floorPatch, FLOORS, room, WALLS } from "../interior.ts";

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
	c.block(19, 2, false).add({ type: "door", x: 19, y: 2, toMap: "town-hall-basement", toSpawn: "stairs" });
	c.add({ type: "spawn", id: "basement", x: 19, y: 3, facing: "down" });
	c.add({ type: "sign", x: 4, y: 2, text: "* A past mayor. She is smiling. Nobody on the council knows why." });
	c.add({ type: "sign", x: 11, y: 3, text: "* The lectern. A note taped to it says: KEEP IT SHORT." });
	return c;
}

/**
 * The municipal IT department in the basement: grey walls, dark carpet, no windows. Racks
 * humming along the back wall, a row of printers (the real job), the helpdesk, and Fido,
 * the server in the corner.
 */
export function townHallBasement(): MapCanvas {
	const c = new MapCanvas(24, 14);
	const r = { x: 2, y: 1, w: 20, h: 11 };
	room(c, r, { wall: WALLS.officeGrey, floor: FLOORS.carpetDark });
	floorPatch(c, { x: 14, y: 3, w: 8, h: 4 }, FLOORS.carpetGrey);

	// Stairs up in the back-left corner; the second step is the door back up.
	c.stamp(F.stairsUp, 2, 1);
	c.block(3, 2, false).add({ type: "door", x: 3, y: 2, toMap: "town-hall", toSpawn: "basement" });
	c.add({ type: "spawn", id: "stairs", x: 3, y: 5, facing: "down" });

	// Back wall: the racks, the ticket board, and Fido alone in the corner.
	c.stamp(F.serverRackLow, 6, 1).stamp(F.serverRack, 8, 1).stamp(F.serverRack, 10, 1).stamp(F.serverRackLow, 12, 1);
	for (const x of [7, 9, 11, 13]) c.add(glow(x, 3, GLOWS.greenSpill));
	c.stamp(F.whiteboardChart, 15, 0).stamp(F.waterCooler, 18, 1);
	c.stamp(F.serverRack, 20, 1);
	c.add(glow(21, 3, GLOWS.greenSpill));

	// The printers, in a row along the right, on their own carpet.
	c.stamp(F.printerBig, 14, 4).stamp(F.printer, 16, 4).stamp(F.printerBig, 18, 4);

	// The helpdesk: two rows of workstations.
	for (const [x, y] of [
		[4, 8],
		[7, 8],
		[10, 8],
		[15, 9],
		[18, 9],
	]) {
		c.stamp(F.officeChair, x + 1, y - 2).stamp(F.workstation, x, y);
		shadowUnder(c, F.workstation, x, y, true);
		c.add(glow(x, y + 1, GLOWS.screen));
	}
	c.stamp(F.plantTall, 2, 9);

	const bjorn = NPCS.find((n) => n.id === "sysadmin")!;
	c.add({ type: "npc", id: "sysadmin", character: "sysadmin", x: 13, y: 7, facing: "down", name: bjorn.name, dialogue: "sysadmin" });
	c.add({ type: "sign", x: 16, y: 2, text: "* The ticket board. OPEN: 4012. Under it, in marker: \"most of them are the printer\"." });
	c.add({ type: "sign", x: 21, y: 3, text: "* A server with a name tag: FIDO. A dog biscuit sits on top of it. Best not to touch." });
	c.add({ type: "sign", x: 17, y: 6, text: "* The printers. One of them says PC LOAD LETTER. Nobody knows what that means." });
	return c;
}
