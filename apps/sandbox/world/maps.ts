// The sandbox's one map: a small workshop, built the way every kai map is, in code, from
// the art adapter's pieces. `bun run world:gen` writes it to world/maps/workshop.tmj.
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { glow, GLOWS } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import type { GeneratedMap } from "@datagutt/kai-worldgen/maps";

function workshop(): MapCanvas {
	const c = new MapCanvas(14, 10);
	const r = { x: 2, y: 1, w: 10, h: 7 };
	room(c, r, { wall: WALLS.cream, floor: FLOORS.oak });
	c.stamp(F.retroPc, 2, 5).stamp(F.pcTower, 4, 5);
	c.add(glow(3, 6, GLOWS.screen));
	c.add({ type: "npc", id: "keeper", character: "keeper", x: 7, y: 4, facing: "down", name: "Keeper", dialogue: "keeper" });
	c.add({ type: "sign", x: 3, y: 6, text: "* A computer. On screen: kai.json, content/, dialogue/, world/. That's a game." });
	c.add({ type: "spawn", id: "start", x: 7, y: 7, facing: "up" });
	return c;
}

export const GENERATED_MAPS: GeneratedMap[] = [{ id: "workshop", properties: { name: "Workshop" }, build: workshop }];
