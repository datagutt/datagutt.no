// Up the mountain trail (docs/PLAN.md B6): open once the passport is full. A path
// climbs from the trailhead through a meadow ringed with pines to the hytte, with a bench
// at a lookout over the fjord. The hytte is locked for now: later quests start here.
import { variant } from "@datagutt/kai-worldgen/autotile";
import { GRASS, TERRAIN } from "@datagutt/kai-limezu/palette";
import { PREFABS } from "../prefabs.ts";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { building, forest, meadow, sign } from "@datagutt/kai-limezu/features";
import { Region } from "@datagutt/kai-worldgen/layout";
import { mapText } from "../text.ts";
import { spriteObject } from "@datagutt/kai/world/objects";
import { glow, GLOWS } from "@datagutt/kai-limezu/lighting";

const W = 40;
const H = 30;

export function mountain(): MapCanvas {
	const say = mapText("mountain");
	const c = new MapCanvas(W, H);
	c.fill("ground", (x, y) => variant(GRASS, x, y));

	const trail = new Region(W, H)
		.path([[20, 29], [20, 23], [13, 23], [13, 15], [22, 15], [22, 10]])
		.path([[22, 19], [31, 19]]); // out to the lookout
	c.autotile("ground2", trail.drawable(), TERRAIN.dirt);

	// The hytte at the top; its door stays shut with a note for now.
	const hytte = building(c, PREFABS.hytte, 15, 1);
	const door = { x: hytte.x, y: hytte.y - 1 };
	c.block(door.x, door.y).add({
		type: "sign",
		x: door.x,
		y: door.y,
		text: say("hytte-door"),
	});

	// The lookout: a bench facing out over the fjord, far below.
	c.stamp(PREFABS.bench, 32, 18);
	// A campfire by the bench, lit day and night; it throws its light after dark.
	c.block(30, 17).add(spriteObject.at(30, 16, { sprite: "campfire" })).add({ ...glow(30, 17, GLOWS.fire), when: "night" });
	c.add(spriteObject.at(22, 21, { sprite: "butterfly", seasons: "spring,summer", when: "day" }));
	sign(c, 34, 19, say("lookout"), "signpost");

	// Rocks from the old rockfall, pushed off the path.
	for (const [kind, x, y] of [
		["rockBig", 17, 25],
		["rock", 23, 24],
		["rockSmall", 10, 18],
		["rockLong", 26, 12],
		["rock", 9, 11],
		["rockSmall", 29, 22],
	] as const) {
		c.stamp(PREFABS[kind], x, y);
	}

	c.add({ type: "door", x: 20, y: 28, toMap: "town", toSpawn: "trail" });
	c.add({ type: "spawn", id: "trailhead", x: 20, y: 27, facing: "up" });

	// Pines all round, thinner in the meadow; nothing grows on the path or the hytte.
	const taken = Region.from(W, H, (x, y) => {
		const i = y * W + x;
		return c.collision[i] === 1 || c.layers.below[i] !== null || c.layers.above[i] !== null;
	}).union(trail.grow(1));
	const edge = new Region(W, H).rect(0, 0, W, 3).rect(0, 0, 5, H).rect(W - 5, 0, 5, H).rect(0, H - 3, 17, 3).rect(24, H - 3, 16, 3);
	forest(c, edge, 11, [PREFABS.pineTall, PREFABS.pineMid, PREFABS.pineSmall, PREFABS.pineMid], 0.85, taken);
	forest(c, new Region(W, H).rect(5, 3, 30, 24), 12, [PREFABS.pineMid, PREFABS.pineSmall, PREFABS.oak], 0.12, taken);

	const open = Region.from(W, H, (x, y) => {
		const i = y * W + x;
		return !c.collision[i] && c.layers.ground2[i] === null && !c.layers.decal[i] && !c.layers.below[i] && !c.layers.above[i];
	});
	meadow(c, open, 23);
	return c;
}
