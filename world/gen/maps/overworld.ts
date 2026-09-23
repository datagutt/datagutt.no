// The overworld: Fjord Town on the north shore of a fjord (docs/game/DESIGN.md §5).
// Work in progress for M3.7; the greybox `town` stays the live map until this is approved.
import { GRASS, TERRAIN } from "../../art/palette.ts";
import { variant } from "../../art/autotile.ts";
import { MapCanvas } from "../canvas.ts";
import { Region, wobble } from "../layout.ts";

export const W = 80;
export const H = 60;

export function overworld(): MapCanvas {
	const c = new MapCanvas(W, H);
	c.fill("ground", (x, y) => variant(GRASS, x, y));

	// The shoreline wobbles around row 44; sand is the band just above it.
	const shore = wobble(11, W, 9).map((v) => Math.round(44 + v * 3));
	const sea = Region.from(W, H, (x, y) => y >= shore[x]);
	const sand = Region.from(W, H, (x, y) => y >= shore[x] - 3);
	c.autotile("ground", sand.drawable("inside"), TERRAIN.sand, { edge: "inside" });
	c.autotile("ground2", sea.drawable("inside"), TERRAIN.sea, { edge: "inside" });
	sea.each((x, y) => c.block(x, y));

	c.add({ type: "spawn", id: "ferry", x: 40, y: shore[40] - 2, facing: "up" });
	return c;
}
