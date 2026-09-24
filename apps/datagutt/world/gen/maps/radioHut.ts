// The radio hut (places: radio-tower): Kjell's control room at the foot of the tower,
// for IRLServer. Industrial walls, concrete; a transceiver and a transmitter along the
// back wall, the screens showing signal bars, a retro PC, a spare transceiver and
// status lights blinking. Kjell's lines are about bonded cables and signal bars.
import { NPCS } from "../../../game/npcs.ts";
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { mapText } from "../text.ts";

export function radioHut(): MapCanvas {
	const say = mapText("radio-hut");
	const c = new MapCanvas(14, 10);
	const r = { x: 2, y: 1, w: 10, h: 7 };
	room(c, r, { wall: WALLS.industrial, floor: FLOORS.concrete });

	// Back wall: the transceiver with its antenna, the signal screens, the transmitters.
	c.stamp(F.transceiverAntenna, 2, 1);
	c.stamp(F.signalScreens, 5, 1);
	c.stamp(F.transmitter, 10, 1);
	// The workbench corner: a retro PC; a spare transceiver on the other side.
	c.stamp(F.retroPc, 2, 5).stamp(F.pcTower, 4, 5);
	c.stamp(F.transceiver, 9, 5);

	// Screens glow; status lights blink.
	c.add(glow(7, 3, GLOWS.screen)).add(glow(3, 6, GLOWS.screen));
	c.add(glow(10, 3, { ...GLOWS.onAir, radius: 0.9, flicker: true })).add(glow(3, 3, { ...GLOWS.onAir, color: "60ff80", radius: 0.9, flicker: true }));

	exitDoor(c, r, 7, { toMap: "town", toSpawn: "radio_hut_door" });
	const kjell = NPCS.find((n) => n.id === "technician")!;
	c.add({ type: "npc", id: "technician", character: "technician", x: 7, y: 4, facing: "down", name: kjell.name, dialogue: "technician" });
	c.add({ type: "sign", x: 7, y: 2, text: say("signal-meter") });
	c.add({ type: "sign", x: 3, y: 3, text: say("transceiver") });
	c.add({ type: "sign", x: 10, y: 6, text: say("spare-transceiver") });
	c.add({ type: "sign", x: 3, y: 6, text: say("old-radio") });
	return c;
}
