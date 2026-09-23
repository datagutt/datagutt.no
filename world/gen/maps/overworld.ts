// The overworld: Fjord Town on the north shore of a fjord (docs/game/DESIGN.md §5).
// Work in progress for M3.7; the greybox `town` stays the live map until this is approved.
//
//   x:  0-4 forest | 5-34 farm, datagutt's street, boathouse | 35-62 library, town hall,
//       square, post office, harbour | 63-90 radio hill, office, smithy | 91-95 forest
import { NPCS } from "../../../game/npcs.ts";
import type { Facing, MapObject } from "../../../game/world/objects.ts";
import { COBBLE, GRASS, TERRAIN } from "../../art/palette.ts";
import { PREFABS } from "../../art/prefabs.ts";
import { variant } from "../../art/autotile.ts";
import { MapCanvas } from "../canvas.ts";
import { building, forest, pier, plateau } from "../features.ts";
import { Region, wobble } from "../layout.ts";

export const W = 96;
export const H = 76;

function npc(id: string, x: number, y: number, facing: Facing): MapObject {
	const roster = NPCS.find((n) => n.id === id);
	if (!roster) throw new Error(`Overworld places unknown NPC "${id}"`);
	return { type: "npc", id, character: id, x, y, facing, name: roster.name, dialogue: id };
}

export function overworld(): MapCanvas {
	const c = new MapCanvas(W, H);
	c.fill("ground", (x, y) => variant(GRASS, x, y));

	// --- The fjord ---------------------------------------------------------------------
	// Steps in the shoreline come in runs of three columns so the sea edge draws cleanly.
	const wave = wobble(11, W, 12);
	const shore = Array.from({ length: W }, (_, x) => Math.round(64 + wave[x - (x % 3)] * 2));
	const sea = Region.from(W, H, (x, y) => y >= shore[x]);
	const sand = Region.from(W, H, (x, y) => y >= shore[x] - 4);

	// --- Paths ---------------------------------------------------------------------------
	const HARBOUR_X = 49;
	const paths = new Region(W, H)
		.path([[5, 42], [90, 42]]) // main road
		.path([[14, 21], [14, 42]]) // farm lane
		.path([[34, 27], [34, 42]]) // library
		.path([[45, 26], [45, 30]]) // town hall
		.path([[66, 18], [66, 42]]) // up to the radio hill
		.path([[72, 37], [72, 42]]) // office
		.path([[86, 37], [86, 42]]) // smithy
		.path([[HARBOUR_X, 42], [HARBOUR_X, 62]], 3) // harbour road to the pier
		.path([[8, 40], [8, 42]]) // villas
		.path([[18, 40], [18, 42]])
		.path([[28, 40], [28, 42]]) // (villaBlue's door is at x 28)
		.path([[41, 56], [41, 59]]) // post office to the beach
		.path([[4, 44], [4, 60]]); // down the west side to the boathouse beach
	const square = new Region(W, H).rect(38, 29, 25, 13);
	const field = new Region(W, H).rect(18, 22, 12, 6);

	c.autotile("ground2", sand.drawable("inside"), TERRAIN.sand, { edge: "inside" });
	c.autotile("ground2", paths.clone().union(square).subtract(sand).drawable(), TERRAIN.dirt);
	c.autotile("ground2", field.drawable(), TERRAIN.orangeDirt);
	c.autotile("decal", sea.drawable("inside"), TERRAIN.sea, { edge: "inside" });
	sea.each((x, y) => c.block(x, y));
	new Region(W, H).rect(39, 30, 23, 11).each((x, y) => c.put("decal", x, y, COBBLE(x, y)));

	// --- Radio hill ------------------------------------------------------------------------
	plateau(c, 63, 5, 27, 10, [66, 67]);

	// --- Buildings -------------------------------------------------------------------------
	building(c, "farmhouse", 5, 7);
	c.stamp(PREFABS.windmill, 23, 8);
	building(c, "library", 29, 5, { toMap: "library", toSpawn: "entrance", addDoor: true });
	building(c, "townHall", 42, 4, { toMap: "town-hall", toSpawn: "entrance", addDoor: true });
	c.stamp(PREFABS.radioTower, 79, 5);
	building(c, "office", 69, 22);
	building(c, "smithy", 79, 28);
	building(c, "villaOrange", 6, 29);
	const home = building(c, "homeVilla", 16, 29, { toMap: "house", toSpawn: "entrance" });
	building(c, "villaBlue", 26, 29);
	building(c, "kiosk", 57, 30);
	building(c, "postOffice", 37, 44);
	building(c, "boathouse", 7, 47);
	pier(c, 22, shore[22] - 1, shore[22] + 3);
	building(c, "villaPurple", 64, 45);
	building(c, "villaBrown", 76, 45);

	// --- Harbour -------------------------------------------------------------------------
	const pierTop = shore[HARBOUR_X] - 1;
	const pierEnd = pierTop + 8;
	pier(c, HARBOUR_X, pierTop, pierEnd);

	// --- Forest edge -----------------------------------------------------------------------
	const taken = new Region(W, H);
	// Nothing grows on buildings, paths, the square, the beach or the plateau.
	for (let i = 0; i < W * H; i++) if (c.collision[i] || c.layers.below[i] || c.layers.ground2[i]) taken.cells[i] = 1;
	const edge = new Region(W, H)
		.rect(0, 0, W, 5)
		.rect(0, 0, 5, 60)
		.rect(91, 0, 5, 60)
		.subtract(sand);
	forest(c, edge, 3, ["pineTall", "pineMid", "pineSmall", "pineMid"], 0.9, taken);
	const groves = new Region(W, H).rect(5, 5, 60, 2).rect(52, 44, 10, 12).rect(30, 44, 6, 12).rect(88, 17, 3, 40);
	forest(c, groves.subtract(sand), 5, ["oak", "roundTree", "pineMid"], 0.25, taken);

	// --- Objects ---------------------------------------------------------------------------
	c.add({ type: "spawn", id: "ferry", x: HARBOUR_X + 1, y: pierEnd - 1, facing: "up" });
	c.add({ type: "spawn", id: "house_door", x: home.x, y: home.y, facing: "down" });
	c.add({ type: "spawn", id: "office_door", x: 72, y: 37, facing: "down" });
	c.add({ type: "sign", x: HARBOUR_X + 3, y: pierTop - 2, text: "Welcome to Fjord Town. Population: small, but opinionated." });
	c.add(npc("ferryman", HARBOUR_X + 1, pierEnd, "up"));
	c.add(npc("streamer", 14, 60, "down"));
	c.add(npc("technician", 83, 12, "left"));
	c.add(npc("shopkeeper", 59, 38, "down"));
	c.add(npc("coworker", 74, 38, "left"));
	c.add(npc("sysadmin", 47, 27, "down"));
	c.add(npc("smith", 88, 37, "left"));
	c.add(npc("librarian", 36, 28, "right"));
	c.add(npc("farmer", 20, 28, "up"));
	c.add(npc("postmaster", 43, 58, "left"));
	return c;
}
