// The title screen's foreground (docs/game/PLAN.md M5.11): the waterfront drawn from the
// game's own tiles, rendered to public/game/ui/title.png by `pnpm assets`. Nothing is
// painted above the tree line, so the page's drawn sky and mountains show through it
// (components/game/TitleArt.tsx). Its horizontal middle, the pier, lines up with the
// middle of the sky.
import { variant } from "../art/autotile.ts";
import { GRASS, TERRAIN } from "../art/palette.ts";
import { PREFABS } from "../art/prefabs.ts";
import { MapCanvas } from "./canvas.ts";
import { pier } from "./features.ts";
import { Region, wobble } from "./layout.ts";

export const TITLE_W = 40;
export const TITLE_H = 10;
/** The first row with ground; the rows above only hold tree tops and roofs. */
const GROUND = 2;

export function titleScene(): MapCanvas {
	const c = new MapCanvas(TITLE_W, TITLE_H);
	c.fill("ground", (x, y) => (y >= GROUND ? variant(GRASS, x, y) : null));

	const wave = wobble(5, TITLE_W, 8);
	const shore = Array.from({ length: TITLE_W }, (_, x) => Math.round(6 + wave[x - (x % 3)]));
	const sand = Region.from(TITLE_W, TITLE_H, (x, y) => y >= shore[x] - 2);
	const sea = Region.from(TITLE_W, TITLE_H, (x, y) => y >= shore[x]);
	c.autotile("ground2", sand.drawable("inside"), TERRAIN.sand, { edge: "inside" });
	c.autotile("decal", sea.drawable("inside"), TERRAIN.sea, { edge: "inside" });

	// Two rows of pines along the back hide the straight edge where the grass stops.
	const pines = ["pineMid", "pineTall", "pineSmall"] as const;
	for (let x = -2; x < TITLE_W; x += 2) {
		if ((x >= 7 && x <= 11) || (x >= 27 && x <= 30)) continue; // the kiosk's and hut's roofs cover the edge there
		const kind = PREFABS[pines[(x + 4) % pines.length]];
		c.stamp(kind, x, Math.max(0, GROUND + 1 - kind.h));
	}
	for (let x = -1; x < TITLE_W; x += 2) {
		if ((x >= 7 && x <= 12) || (x >= 27 && x <= 30)) continue;
		const kind = PREFABS[pines[(x + 1) % pines.length]];
		c.stamp(kind, x, GROUND + 2 - kind.h + ((x + 1) % 3 === 0 ? 0 : 1));
	}
	c.stamp(PREFABS.kiosk, 8, 0).stamp(PREFABS.hut, 28, 1);
	c.stamp(PREFABS.lamp, 17, 0).stamp(PREFABS.lamp, 23, 0);

	pier(c, 20, shore[20] - 1, TITLE_H - 1);
	c.stamp(PREFABS.ferry, 22, shore[22]);
	c.stamp(PREFABS.rowboat, 11, shore[11] + 1);
	return c;
}
