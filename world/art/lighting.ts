// Shade pieces (tiles from the generated fx sheet, on the multiplied `shade` layer) and
// light presets (map objects the game draws additively; see game/fx/Lights.ts).
import type { LightObject } from "../../game/world/objects.ts";
import type { Prefab } from "../gen/canvas.ts";

const shade = (col: number, w: number): Prefab => ({ sheet: "fx", col, row: 0, w, h: 1, aboveRows: 0, collision: [], rowLayers: ["shade"] });

export const SHADE = {
	/** An oval shadow under furniture (3×1). */
	blob: shade(0, 3),
	/** Darkest at the top, fading down: under a ledge or along a wall. */
	fade: shade(3, 1),
	solid: shade(4, 1),
};

type Glow = Omit<Extract<LightObject, { shape: "glow" }>, "x" | "y" | "type" | "shape">;

/** Kinds of glow, by what gives off the light. Radius is in tiles. */
export const GLOWS = {
	fire: { radius: 2.5, color: "ffae62", intensity: 0.5, flicker: true },
	lamp: { radius: 2, color: "ffd08a", intensity: 0.45, flicker: false },
	screen: { radius: 1.6, color: "78b4ff", intensity: 0.35, flicker: false },
	onAir: { radius: 1.2, color: "ff4038", intensity: 0.55, flicker: false },
	studio: { radius: 3, color: "fff4e0", intensity: 0.3, flicker: false },
	greenSpill: { radius: 2.2, color: "78ff8c", intensity: 0.22, flicker: false },
} satisfies Record<string, Glow>;

export function glow(x: number, y: number, kind: Glow): LightObject {
	return { type: "light", shape: "glow", x, y, ...kind };
}

/** Daylight from a window falling onto the floor below it: w×h tiles from (x, y). */
export function windowLight(x: number, y: number, w = 2, h = 3): LightObject {
	return { type: "light", shape: "beam", x, y, w, h, color: "fff0d2", intensity: 0.4 };
}
