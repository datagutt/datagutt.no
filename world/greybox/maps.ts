// Greybox maps for the engine core (docs/game/PLAN.md M1.12). The town is generated now
// (world/gen/maps/overworld.ts); the house stays greybox until its interior (M3.8).
import type { MapSpec } from "../tiled.ts";
import { CharGrid } from "../grid.ts";
import { GREYBOX_TILES } from "./tiles.ts";
import { NPCS } from "../../game/npcs.ts";
import type { Facing, MapObject } from "../../game/world/objects.ts";

const legend = Object.fromEntries(GREYBOX_TILES.map((t, i) => [t.char, i]));

function npcObject(id: string, x: number, y: number, facing: Facing): MapObject {
	const roster = NPCS.find((n) => n.id === id);
	if (!roster) throw new Error(`Greybox map places unknown NPC "${id}"`);
	return { type: "npc", id, character: id, x, y, facing, name: roster.name, dialogue: id };
}

function houseInterior(): MapSpec {
	const W = 12;
	const H = 9;
	const g = new CharGrid(W, H, "_");
	g.frame(0, 0, W, H, "X");
	g.rect(1, 1, W - 2, 2, "|");
	g.stamp(1, 3, ["BB P    b "]);
	g.stamp(1, 4, ["        b "]);
	g.stamp(4, 5, ["rrr"]).stamp(4, 6, ["rTr"]);
	g.set(6, H - 1, "_"); // the doorway
	return {
		id: "house",
		width: W,
		height: H,
		legend,
		layers: [{ name: "ground", rows: g.rows() }],
		properties: { name: "datagutt's house" },
		objects: [
			{ type: "spawn", id: "entrance", x: 6, y: 7, facing: "up" },
			{ type: "door", x: 6, y: 8, toMap: "town", toSpawn: "house_door" },
			npcObject("datagutt", 4, 4, "down"),
			{ type: "sign", x: 4, y: 3, text: "* It's a PC. Several terminals are open. Something is compiling." },
		],
	};
}

export const GREYBOX_MAPS: MapSpec[] = [houseInterior()];
