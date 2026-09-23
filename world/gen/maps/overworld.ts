// The overworld, map id `town`: Fjord Town on the north shore of a fjord
// (docs/game/DESIGN.md §5). Approved by the user on 2026-09-23 (M3.7).
//
//   x:  0-4 forest | 5-34 farm, datagutt's street, boathouse | 35-62 library, town hall,
//       square, post office, harbour | 63-90 radio hill, office, smithy | 91-95 forest
import { NPCS } from "../../../game/npcs.ts";
import type { Facing, MapObject } from "../../../game/world/objects.ts";
import { COBBLE, CROPS, GRASS, TERRAIN } from "../../art/palette.ts";
import { PREFABS } from "../../art/prefabs.ts";
import { variant } from "../../art/autotile.ts";
import { MapCanvas } from "../canvas.ts";
import { building, fence, forest, meadow, pier, plateau, sign } from "../features.ts";
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
	// The farm field, fenced, with a gate onto the farm lane (M3.11 grows it from live data).
	const FIELD = { x: 16, y: 20, w: 12, h: 8 };
	const field = new Region(W, H).rect(FIELD.x + 1, FIELD.y + 1, FIELD.w - 2, FIELD.h - 2);

	c.autotile("ground2", sand.drawable("inside"), TERRAIN.sand, { edge: "inside" });
	c.autotile("ground2", paths.clone().union(square).subtract(sand).drawable(), TERRAIN.dirt);
	c.autotile("ground2", field.drawable(), TERRAIN.orangeDirt);
	c.autotile("decal", sea.drawable("inside"), TERRAIN.sea, { edge: "inside" });
	sea.each((x, y) => c.block(x, y));
	new Region(W, H).rect(39, 30, 23, 11).each((x, y) => c.put("decal", x, y, COBBLE(x, y)));

	fence(c, FIELD.x, FIELD.y, FIELD.w, FIELD.h, [[FIELD.x, FIELD.y + 4]]);
	field.each((x, y) => (y - FIELD.y) % 2 === 1 && c.put("decal", x, y, CROPS[(x * 7 + y * 3) % CROPS.length]));

	// --- Radio hill ------------------------------------------------------------------------
	plateau(c, 63, 5, 27, 10, [66, 67]);
	c.stamp(PREFABS.hut, 75, 9);

	// --- Buildings -------------------------------------------------------------------------
	building(c, "farmhouse", 5, 7);
	c.stamp(PREFABS.windmill, 23, 8);
	building(c, "library", 29, 5, { addDoor: true });
	building(c, "townHall", 42, 4, { addDoor: true });
	c.stamp(PREFABS.radioTower, 79, 5);
	building(c, "office", 69, 22);
	building(c, "smithy", 79, 28);
	building(c, "villaOrange", 6, 29);
	const home = building(c, "homeVilla", 16, 29, { link: { toMap: "house", toSpawn: "entrance" } });
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
	c.stamp(PREFABS.ferry, HARBOUR_X + 3, pierEnd - 4);
	// Moored with its rope end (right) at the boathouse pier.
	c.stamp(PREFABS.rowboat, 18, Math.max(...shore.slice(18, 22)));

	// --- Town furniture --------------------------------------------------------------------
	c.stamp(PREFABS.bigFountain, 48, 32);
	c.stamp(PREFABS.benchLong, 43, 33).stamp(PREFABS.benchLong, 54, 33);
	for (const [x, y] of [[39, 29], [61, 29], [39, 37], [61, 37]]) c.stamp(PREFABS.lamp, x, y);
	// Lamps along the south verge of the main road (a lamp's base is its bottom tile).
	for (const x of [12, 24, 32, 45, 57, 64, 78, 89]) c.stamp(PREFABS.lamp, x, 42);
	c.stamp(PREFABS.planter, 41, 26).stamp(PREFABS.planter, 48, 26);
	c.stamp(PREFABS.bench, HARBOUR_X + 4, shore[HARBOUR_X + 4] - 4);

	// --- Forest edge -----------------------------------------------------------------------
	// Nothing grows on buildings, props, paths, the square, the field or the beach.
	const taken = Region.from(W, H, (x, y) => {
		const i = y * W + x;
		return c.collision[i] === 1 || c.layers.below[i] !== null || c.layers.above[i] !== null;
	})
		.union(paths.grow(1))
		.union(square.grow(1))
		.union(sand)
		.union(new Region(W, H).rect(FIELD.x, FIELD.y, FIELD.w, FIELD.h));
	const edge = new Region(W, H)
		.rect(0, 0, W, 5)
		.rect(0, 0, 5, 60)
		.rect(91, 0, 5, 60)
		.rect(64, 5, 25, 2) // the back of the radio hill
		.subtract(sand);
	forest(c, edge, 3, ["pineTall", "pineMid", "pineSmall", "pineMid"], 0.9, taken);
	const groves = new Region(W, H).rect(5, 5, 58, 2).rect(52, 44, 10, 12).rect(30, 44, 6, 12).rect(76, 17, 14, 8).rect(88, 17, 3, 40);
	forest(c, groves.subtract(sand), 5, ["oak", "roundTree", "pineMid"], 0.25, taken);

	// --- Meadow details on whatever grass is left --------------------------------------------
	const onGrass = (i: number) => c.layers.ground2[i] === null;
	const open = Region.from(W, H, (x, y) => {
		const i = y * W + x;
		return !c.collision[i] && onGrass(i) && !c.layers.decal[i] && !c.layers.below[i] && !c.layers.above[i];
	});
	meadow(c, open, 17);

	// --- Objects ---------------------------------------------------------------------------
	c.add({ type: "spawn", id: "ferry", x: HARBOUR_X + 1, y: pierEnd - 2, facing: "up" });
	c.add({ type: "spawn", id: "house_door", x: home.x, y: home.y, facing: "down" });
	c.add({ type: "spawn", id: "office_door", x: 72, y: 37, facing: "down" });
	sign(c, HARBOUR_X + 3, pierTop - 2, "Welcome to Fjord Town. Population: small, but opinionated.");
	// A name sign in front of every building, so the town reads without talking to anyone.
	sign(c, 24, 41, "datagutt's house. Thomas lives here. The door is open, and so is the fridge (energy drinks only).");
	sign(c, 33, 27, "Fjord Town Library. Every book on the shelves is one of datagutt's repositories. Shh.");
	sign(c, 44, 26, "Town Hall. The basement hums. That's the servers, not the ghosts. Probably.");
	sign(c, 13, 21, "Ola's farm. The crops grow when datagutt pushes code. Nobody knows how.");
	sign(c, 60, 35, "Kiosk. Snacks, newspapers and Randi's opinions, all free.");
	sign(c, 40, 57, "Post Office. Letters for datagutt are delivered by Liv, rain or shine.");
	sign(c, 10, 61, "Boathouse Studio. When the red light is on, Sunniva is live. Keep it down.");
	sign(c, 71, 37, "Nettbureau. datagutt's day job, since 2021.");
	sign(c, 85, 37, "Smithy. Tor forges tools, and the skills to use them.");
	sign(c, 78, 13, "Radio Tower. Kjell keeps it running, so the streams stay live.");
	c.add(npc("ferryman", HARBOUR_X + 2, pierEnd - 1, "left"));
	c.add(npc("streamer", 14, 61, "down"));
	c.add(npc("technician", 83, 12, "left"));
	c.add(npc("shopkeeper", 58, 35, "down"));
	c.add(npc("coworker", 74, 38, "left"));
	c.add(npc("sysadmin", 47, 27, "down"));
	c.add(npc("smith", 88, 37, "left"));
	c.add(npc("librarian", 36, 28, "right"));
	c.add(npc("farmer", 20, 28, "up"));
	c.add(npc("postmaster", 43, 58, "left"));
	return c;
}
