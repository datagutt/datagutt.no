// The overworld, map id `town`: Fjord Town on the north shore of a fjord
// (docs/DESIGN.md §5). Approved by the user on 2026-09-23 (M3.7).
//
//   x:  0-4 forest | 5-34 farm, datagutt's street, boathouse | 35-62 library, town hall,
//       square, post office, harbour | 63-90 radio hill, office, gym | 91-95 forest
import { NPCS } from "../../../game/npcs.ts";
import type { Facing, MapObject } from "@datagutt/kai/world/objects";
import { arcadeObject } from "@datagutt/kai-arcade/object";
import { cropsObject } from "@datagutt/kai-live/github/objects";
import { catObject } from "../../../game/plugins/cat.object.ts";
import { COBBLE, CROPS, GRASS, TERRAIN } from "@datagutt/kai-limezu/palette";
import { refKey } from "@datagutt/kai-worldgen/registry";
import { glow, NIGHT_LIGHTS } from "@datagutt/kai-limezu/lighting";
import { PREFABS } from "../prefabs.ts";
import { variant } from "@datagutt/kai-worldgen/autotile";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { building, fence, forest, meadow, pier, plateau, sign } from "@datagutt/kai-limezu/features";
import { Region, wobble } from "@datagutt/kai-worldgen/layout";
import { mapText } from "../text.ts";

export const W = 96;
export const H = 76;

function npc(id: string, x: number, y: number, facing: Facing): MapObject {
	const roster = NPCS.find((n) => n.id === id);
	if (!roster) throw new Error(`Overworld places unknown NPC "${id}"`);
	return { type: "npc", id, character: id, x, y, facing, name: roster.name, dialogue: id };
}

export function overworld(): MapCanvas {
	const say = mapText("town");
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
		.path([[14, 28], [3, 28], [3, 42]]) // farm lane: farmhouse door, west, down to the road
		.path([[34, 27], [34, 42]]) // library
		.path([[45, 26], [45, 30]]) // town hall
		.path([[66, 18], [66, 42]]) // up to the radio hill
		.path([[71, 37], [71, 42]]) // office
		.path([[87, 37], [87, 42]]) // gym
		.path([[HARBOUR_X, 42], [HARBOUR_X, 62]], 3) // harbour road to the pier
		.path([[8, 40], [8, 42]]) // villas
		.path([[18, 40], [18, 42]])
		.path([[28, 40], [28, 42]]) // (villaBlue's door is at x 28)
		.path([[41, 56], [41, 59]]) // post office to the beach
		.path([[51, 54], [57, 54]]) // the youth club: from the harbour road round to its side steps
		.path([[57, 52], [57, 54]])
		.path([[61, 0], [61, 28]]) // the mountain trail, north between the town hall and the radio hill
		.path([[4, 44], [4, 60]]); // down the west side to the boathouse beach
	const square = new Region(W, H).rect(38, 29, 25, 13);
	// The farm field along the top of the farm: 26 weeks × 7 days inside the fence, laid out
	// like GitHub's contribution calendar. The game plants it from live data (M3.11); the
	// generator sows a sample so renders and placeholder builds show a field.
	const FIELD = { x: 1, y: 5, w: 28, h: 9 };
	const field = new Region(W, H).rect(FIELD.x + 1, FIELD.y + 1, FIELD.w - 2, FIELD.h - 2);

	c.autotile("ground2", sand.drawable("inside"), TERRAIN.sand, { edge: "inside" });
	c.autotile("ground2", paths.clone().union(square).subtract(sand).drawable(), TERRAIN.dirt);
	c.autotile("ground2", field.drawable(), TERRAIN.orangeDirt);
	c.autotile("decal", sea.drawable("inside"), TERRAIN.sea, { edge: "inside" });
	sea.each((x, y) => c.block(x, y));
	new Region(W, H).rect(39, 30, 23, 11).each((x, y) => c.put("decal", x, y, COBBLE(x, y)));

	fence(c, FIELD.x, FIELD.y, FIELD.w, FIELD.h, [[15, FIELD.y + FIELD.h - 1]]);
	field.each((x, y) => (x * 7 + y * 3) % 5 !== 0 && c.put("decal", x, y, CROPS[(x * 3 + y * 5) % CROPS.length]));
	c.add(cropsObject.at(FIELD.x + 1, FIELD.y + 1, { w: FIELD.w - 2, h: FIELD.h - 2, stages: CROPS.map(refKey).join("|") }));

	// --- Radio hill ------------------------------------------------------------------------
	plateau(c, 63, 5, 27, 10, [66, 67]);
	const hutDoor = building(c, PREFABS.hut, 75, 9, { link: { toMap: "radio-hut", toSpawn: "entrance" } });

	// --- Buildings -------------------------------------------------------------------------
	const farmDoor = building(c, PREFABS.farmhouse, 5, 14, { link: { toMap: "farmhouse", toSpawn: "entrance" } });
	c.stamp(PREFABS.windmill, 23, 15);
	const libraryDoor = building(c, PREFABS.library, 29, 5, { addDoor: true, link: { toMap: "library", toSpawn: "entrance" } });
	const hallDoor = building(c, PREFABS.townHall, 42, 4, { addDoor: true, link: { toMap: "town-hall", toSpawn: "entrance" } });
	c.stamp(PREFABS.radioTower, 79, 5);
	// The mountain trail (B6): barriers and a rockfall shut it until the passport is full;
	// then the game clears the gate and the way north leads up to the hytte.
	c.stamp(PREFABS.barrierLeft, 60, 7).stamp(PREFABS.barrierMid, 61, 7).stamp(PREFABS.barrierRight, 62, 7);
	c.stamp(PREFABS.rockBig, 61, 5).stamp(PREFABS.rock, 60, 4).stamp(PREFABS.rockSmall, 62, 5).stamp(PREFABS.rockLong, 61, 3);
	c.add({
		type: "gate",
		id: "trail",
		x: 60,
		y: 3,
		w: 3,
		h: 6,
		unlock: "passport",
		text: say("trail-closed"),
	});
	c.add({ type: "door", x: 61, y: 0, toMap: "mountain", toSpawn: "trailhead", unlock: "passport" });
	// A bench at the hill's edge, binoculars left on it: the stars at night (B2).
	c.stamp(PREFABS.bench, 69, 12).stamp(PREFABS.binoculars, 70, 12);
	c.add(arcadeObject.at(70, 13, { game: "stargazing" }));
	// Closed until its interior is built (it waits for LimeZu's Modern Office pack).
	building(c, PREFABS.office, 69, 22, { link: { toMap: "office", toSpawn: "entrance" } });
	const gymDoor = building(c, PREFABS.logCabin, 79, 28, { link: { toMap: "gym", toSpawn: "entrance" } });
	building(c, PREFABS.villaOrange, 6, 29, { closed: say("villa-orange-closed") });
	const home = building(c, PREFABS.homeVilla, 16, 29, { link: { toMap: "house", toSpawn: "entrance" } });
	building(c, PREFABS.villaBlue, 26, 29, { closed: say("villa-blue-closed") });
	const kioskDoor = building(c, PREFABS.kiosk, 57, 30, { link: { toMap: "kiosk", toSpawn: "entrance" } });
	const postDoor = building(c, PREFABS.postOffice, 37, 44, { link: { toMap: "post-office", toSpawn: "entrance" } });
	const boathouseDoor = building(c, PREFABS.boathouse, 7, 47, { link: { toMap: "boathouse", toSpawn: "entrance" } });
	pier(c, 22, shore[22] - 1, shore[22] + 3);
	const clubDoor = building(c, PREFABS.youthClub, 53, 46, { link: { toMap: "youth-club", toSpawn: "entrance" } });
	building(c, PREFABS.villaPurple, 64, 45, { closed: say("villa-purple-closed") });
	building(c, PREFABS.villaBrown, 76, 45, { closed: say("villa-brown-closed") });

	// --- Harbour -------------------------------------------------------------------------
	const pierTop = shore[HARBOUR_X] - 1;
	const pierEnd = pierTop + 8;
	pier(c, HARBOUR_X, pierTop, pierEnd);
	c.stamp(PREFABS.ferry, HARBOUR_X + 3, pierEnd - 4);
	// The intro sails it in (game/scenes/Intro.ts); it needs to know which tiles it is.
	c.add({ type: "area", id: "ferry", x: HARBOUR_X + 3, y: pierEnd - 4, w: PREFABS.ferry.w, h: PREFABS.ferry.h });
	// Moored with its rope end (right) at the boathouse pier.
	c.stamp(PREFABS.rowboat, 18, Math.max(...shore.slice(18, 22)));

	// --- Town furniture --------------------------------------------------------------------
	c.stamp(PREFABS.bigFountain, 48, 32);
	c.stamp(PREFABS.benchLong, 43, 33).stamp(PREFABS.benchLong, 54, 33);
	// Lamps round the square and along the south verge of the main road. They light up
	// after dark from their heads (the prefab's top tile).
	const lamps = [[39, 29], [61, 29], [39, 37], [61, 37], ...[12, 24, 32, 45, 57, 64, 78, 89].map((x) => [x, 42])];
	for (const [x, y] of lamps) c.stamp(PREFABS.lamp, x, y).add(glow(x, y, NIGHT_LIGHTS.streetLamp));
	c.stamp(PREFABS.planter, 41, 26).stamp(PREFABS.planter, 48, 26);
	c.stamp(PREFABS.bench, HARBOUR_X + 4, shore[HARBOUR_X + 4] - 4);
	// Where the live datagutt NPC goes out in town (game/live/datagutt.ts): by the harbour
	// bench looking out over the fjord while music plays, the square otherwise.
	c.add({ type: "spot", id: "datagutt-fjord", x: HARBOUR_X + 5, y: shore[HARBOUR_X + 4] - 2, facing: "down" });
	c.add({ type: "spot", id: "datagutt-square", x: 47, y: 38, facing: "down" });

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
		.rect(0, 14, 3, 46) // west edge, below the field
		.rect(91, 0, 5, 60)
		.rect(64, 5, 25, 2) // the back of the radio hill
		.subtract(sand);
	forest(c, edge, 3, [PREFABS.pineTall, PREFABS.pineMid, PREFABS.pineSmall, PREFABS.pineMid], 0.9, taken);
	const groves = new Region(W, H).rect(5, 5, 58, 2).rect(30, 44, 6, 12).rect(76, 17, 14, 8).rect(88, 17, 3, 40);
	forest(c, groves.subtract(sand), 5, [PREFABS.oak, PREFABS.roundTree, PREFABS.pineMid], 0.25, taken);
	// The trail runs up a rocky gully: boulders on both sides from the barricade to the map's
	// edge, so the gate is the only way in (the forest band is walkable between trunks).
	const gully = ["rockBig", "rock", "rockLong", "rockSmall"] as const;
	for (let y = 0; y <= 6; y++) {
		c.stamp(PREFABS[gully[y % gully.length]], 59, y).stamp(PREFABS[gully[(y + 2) % gully.length]], 63, y);
		c.block(59, y).block(63, y);
	}

	// --- Meadow details on whatever grass is left --------------------------------------------
	const onGrass = (i: number) => c.layers.ground2[i] === null;
	const open = Region.from(W, H, (x, y) => {
		const i = y * W + x;
		return !c.collision[i] && onGrass(i) && !c.layers.decal[i] && !c.layers.below[i] && !c.layers.above[i];
	});
	meadow(c, open, 17);

	// --- Objects ---------------------------------------------------------------------------
	c.add({ type: "spawn", id: "ferry", x: HARBOUR_X + 1, y: pierEnd - 2, facing: "up" });
	// The finale (game/scenes/Finale.ts): Thomas waits at the end of the pier at night.
	c.add({ type: "spot", id: "datagutt-pier", x: HARBOUR_X, y: pierEnd - 1, facing: "down" });
	c.add({ type: "spawn", id: "finale", x: HARBOUR_X, y: pierEnd - 2, facing: "down" });
	c.add({ type: "spawn", id: "house_door", x: home.x, y: home.y, facing: "down" });
	c.add({ type: "spawn", id: "office_door", x: 71, y: 37, facing: "down" });
	c.add({ type: "spawn", id: "boathouse_door", ...boathouseDoor, facing: "down" });
	c.add({ type: "spawn", id: "library_door", ...libraryDoor, facing: "down" });
	c.add({ type: "spawn", id: "kiosk_door", ...kioskDoor, facing: "down" });
	c.add({ type: "spawn", id: "post_office_door", ...postDoor, facing: "down" });
	c.add({ type: "spawn", id: "gym_door", ...gymDoor, facing: "down" });
	c.add({ type: "spawn", id: "farmhouse_door", ...farmDoor, facing: "down" });
	c.add({ type: "spawn", id: "radio_hut_door", ...hutDoor, facing: "down" });
	c.add({ type: "spawn", id: "town_hall_door", ...hallDoor, facing: "down" });
	c.add({ type: "spawn", id: "youth_club_door", ...clubDoor, facing: "down" });
	c.add({ type: "spawn", id: "trail", x: 61, y: 2, facing: "down" });
	// The hidden cat (B3), sunning itself on the far end of the beach behind the last pines.
	c.add(catObject.at(94, 61, {}));
	sign(c, HARBOUR_X + 3, pierTop - 2, say("welcome"));
	// A name sign in front of every building, so the town reads without talking to anyone.
	sign(c, 24, 41, say("datagutt-house"));
	sign(c, 33, 27, say("library"));
	sign(c, 59, 53, say("youth-club"), "signpost");
	sign(c, 44, 26, say("town-hall"));
	sign(c, 12, 28, say("farm"));
	sign(c, 60, 35, say("kiosk"));
	sign(c, 40, 57, say("post-office"));
	sign(c, 10, 61, say("boathouse-studio"));
	sign(c, 69, 37, say("office"));
	sign(c, 85, 37, say("gym"));
	sign(c, 78, 13, say("radio-tower"));
	c.add(npc("ferryman", HARBOUR_X + 2, pierEnd - 1, "left"));
	c.add(npc("farmer", 16, 12, "down"));
	return c;
}
