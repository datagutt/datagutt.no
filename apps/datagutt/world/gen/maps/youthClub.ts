// The youth club (places: youth-club): a site cabin on the harbour road where the old
// website's five canvases live on as arcade cabinets (docs/game/PLAN.md B1). Teal walls,
// dark boards; the cabinets along the back wall, the TV corner with its rug and bean bags,
// a pool table, and Siv who runs the place.
import type { MapObject } from "@datagutt/kai/world/objects";
import { FURNITURE as F } from "@datagutt/kai-limezu/furniture";
import { glow, GLOWS, shadowUnder } from "@datagutt/kai-limezu/lighting";
import { MapCanvas } from "@datagutt/kai-worldgen/canvas";
import { exitDoor, FLOORS, room, WALLS } from "@datagutt/kai-limezu/interior";
import { mapText } from "../text.ts";

const person = (id: string, name: string, x: number, y: number, facing: "up" | "down" | "left" | "right"): MapObject => ({
	type: "npc",
	id,
	character: id,
	x,
	y,
	facing,
	name,
	dialogue: id,
});

export function youthClub(): MapCanvas {
	const say = mapText("youth-club");
	const c = new MapCanvas(20, 13);
	const r = { x: 2, y: 1, w: 16, h: 10 };
	room(c, r, { wall: WALLS.teal, floor: FLOORS.darkWood });

	// The cabinets, screens lit, in the order of the old site's canvas switcher.
	const cabinets = [
		{ x: 3, game: "life" },
		{ x: 5, game: "terrain" },
		{ x: 7, game: "blocks" },
		{ x: 9, game: "dungeon" },
		{ x: 11, game: "starfield" },
	] as const;
	cabinets.forEach(({ x, game }, i) => {
		c.stamp(i % 2 ? F.arcadeRed : F.arcade, x, 1);
		c.add(glow(x, 2, GLOWS.screen));
		c.add({ type: "arcade", x, y: 3, game });
	});

	// The TV corner: consoles on the back wall, the rug and bean bags in front.
	c.stamp(F.tvConsoles, 13, 1);
	c.add(glow(15, 2, GLOWS.screen));
	c.stamp(F.clubRug, 13, 4);
	c.stamp(F.beanBagBlue, 13, 5).stamp(F.beanBagYellow, 16, 5);

	// The pool table, and a plant in the corner by the door.
	c.stamp(F.poolTable, 4, 7);
	shadowUnder(c, F.poolTable, 4, 7, true);
	c.stamp(F.plantTall, 16, 8);

	exitDoor(c, r, 10, { toMap: "town", toSpawn: "youth_club_door" });
	c.add(person("youthWorker", "Siv", 11, 7, "left"));
	c.add(person("clubGamer", "Mats", 8, 4, "up"));
	c.add(person("clubLounger", "Ingrid", 14, 7, "up"));

	c.add({ type: "sign", x: 15, y: 3, text: say("consoles") });
	c.add({ type: "sign", x: 6, y: 8, text: say("pool-table") });
	return c;
}
