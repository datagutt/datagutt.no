// Map lights (LightObject): soft additive sprites over the map and characters. The shapes
// come from lightShapes.ts, baked once into small textures and tinted per light, so any
// number of lights overlap and add up smoothly.
import Phaser from "phaser";
import { TILE } from "../constants.ts";
import type { LightObject } from "../world/objects.ts";
import { beamAlpha, glowAlpha } from "./lightShapes.ts";

const GLOW_KEY = "fx:glow";
const BEAM_KEY = "fx:beam";
const GLOW_SIZE = 64;
const BEAM_W = 32;
const BEAM_H = 48;
export const LIGHT_DEPTH = 60_000;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, alpha: (x: number, y: number) => number) {
	if (scene.textures.exists(key)) return;
	const canvas = scene.textures.createCanvas(key, w, h)!;
	const ctx = canvas.getContext();
	const image = ctx.createImageData(w, h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
			image.data[i + 3] = Math.round(alpha(x + 0.5, y + 0.5) * 255);
		}
	}
	ctx.putImageData(image, 0, 0);
	canvas.refresh();
}

export function addLights(scene: Phaser.Scene, lights: LightObject[], reducedMotion: boolean): Phaser.GameObjects.Image[] {
	bake(scene, GLOW_KEY, GLOW_SIZE, GLOW_SIZE, (x, y) => glowAlpha((x - GLOW_SIZE / 2) / (GLOW_SIZE / 2), (y - GLOW_SIZE / 2) / (GLOW_SIZE / 2)));
	bake(scene, BEAM_KEY, BEAM_W, BEAM_H, (x, y) => beamAlpha(x / BEAM_W, y / BEAM_H));
	return lights.map((light) => {
		const image =
			light.shape === "glow"
				? scene.add.image((light.x + 0.5) * TILE, (light.y + 0.5) * TILE, GLOW_KEY).setDisplaySize(light.radius * 2 * TILE, light.radius * 2 * TILE)
				: scene.add.image(light.x * TILE, light.y * TILE, BEAM_KEY).setOrigin(0, 0).setDisplaySize(light.w * TILE, light.h * TILE);
		image.setBlendMode(Phaser.BlendModes.ADD).setTint(parseInt(light.color, 16)).setAlpha(light.intensity).setDepth(LIGHT_DEPTH);
		if (light.shape === "glow" && light.flicker && !reducedMotion) {
			scene.tweens.add({
				targets: image,
				alpha: { from: light.intensity * 0.75, to: light.intensity },
				duration: 140 + Math.random() * 180,
				yoyo: true,
				repeat: -1,
				ease: "Sine.easeInOut",
				repeatDelay: Math.random() * 120,
			});
		}
		return image;
	});
}
