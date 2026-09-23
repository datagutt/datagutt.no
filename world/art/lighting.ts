// Shade pieces (tiles from the generated fx sheet, on the multiplied `shade` layer) and
// light presets (map objects the game draws additively; see game/fx/Lights.ts).
import type { LightObject } from "../../game/world/objects.ts";
import type { MapCanvas, Prefab } from "../gen/canvas.ts";
import { SHADOW_COL } from "../gen/fx.ts";

const shade = (col: number, w: number): Prefab => ({ sheet: "fx", col, row: 0, w, h: 1, aboveRows: 0, collision: [], rowLayers: ["shade"] });

export const SHADE = {
	/** Darkest at the top, fading down: under a ledge or along a wall. */
	fade: shade(3, 1),
	solid: shade(4, 1),
};

/**
 * A soft contact shadow under a prefab stamped at (x, y): an oval centred on its base
 * (the bottom edge of its lowest solid row), drawn beneath it on the `shade` layer
 * so it shows only around the feet. Grounds furniture instead of floating a blob below.
 * `highBase` for art that ends halfway down its last row (tables on legs).
 */
export function shadowUnder(c: MapCanvas, prefab: Prefab, x: number, y: number, highBase = false): MapCanvas {
	const rows = prefab.coverage?.split("/");
	const base = rows ? rows.findLastIndex((r) => r.includes("#")) : prefab.h - 1;
	for (let dx = 0; dx < prefab.w; dx += 4) {
		const w = Math.min(4, prefab.w - dx);
		c.stamp({ sheet: "fx", col: SHADOW_COL(w), row: highBase ? 3 : 1, w, h: 2, aboveRows: 0, collision: [], rowLayers: ["shade", "shade"] }, x + dx, y + base);
	}
	return c;
}

type Glow = Omit<Extract<LightObject, { shape: "glow" }>, "x" | "y" | "type" | "shape">;

/** Kinds of glow, by what gives off the light. Radius is in tiles. */
export const GLOWS = {
	fire: { radius: 2.5, color: "ffae62", intensity: 0.5, flicker: true },
	lamp: { radius: 2, color: "ffd08a", intensity: 0.45, flicker: false },
	readingLamp: { radius: 2.4, color: "ffd08a", intensity: 0.2, flicker: false },
	screen: { radius: 1.6, color: "78b4ff", intensity: 0.35, flicker: false },
	onAir: { radius: 1.2, color: "ff4038", intensity: 0.55, flicker: false },
	neon: { radius: 1.8, color: "ff5cc8", intensity: 0.5, flicker: false },
	studio: { radius: 3, color: "fff4e0", intensity: 0.3, flicker: false },
	greenSpill: { radius: 2.2, color: "78ff8c", intensity: 0.22, flicker: false },
} satisfies Record<string, Glow>;

export function glow(x: number, y: number, kind: Glow): LightObject {
	return { type: "light", shape: "glow", x, y, ...kind };
}

/** Daylight from a window falling onto the floor below it: w×h tiles from (x, y). Gone at night. */
export function windowLight(x: number, y: number, w = 2, h = 3): LightObject {
	return { type: "light", shape: "beam", x, y, w, h, color: "fff0d2", intensity: 0.4, when: "day" };
}

/** Lights outdoors that only come on after dark (game/world/dayNight.ts). */
export const NIGHT_LIGHTS = {
	/** The head of a street lamp. */
	streetLamp: { radius: 2.6, color: "ffd08a", intensity: 0.75, flicker: false, when: "night" },
	/** A porch light over a front door. */
	porch: { radius: 1.8, color: "ffc070", intensity: 0.6, flicker: false, when: "night" },
} satisfies Record<string, Glow>;
