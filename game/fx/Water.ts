// The fjord (docs/game/PLAN.md M5.2): a shader over open water, which the generator marks
// in a hidden `water` layer. It adds drifting ripples in the sky's colour from the time of
// day, and slow glints (paler, moonlit ones at night), in whole pixels to match the art. Shore tiles are left alone: their art already has the beach and its foam.
// Without WebGL there is no shader and the water stays as drawn.
import Phaser from "phaser";
import { TILE } from "../constants";
import type { Daylight } from "../world/dayNight";

const MASK_KEY = "fx:water-mask";

const FRAGMENT = `
precision mediump float;
uniform sampler2D uMask;
uniform vec2 uTiles;
uniform float uTime;
uniform vec3 uSky;
uniform float uDark;
varying vec2 outTexCoord;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// The mask: 1 on open water, 0.5 on sea under a pier or boat, 0 on land. Off the map
// counts as water: the fjord runs on past the edge. The canvas texture is uploaded
// upside down, hence the flipped row.
float mask(vec2 tile) {
	if (tile.x < 0.0 || tile.y < 0.0 || tile.x >= uTiles.x || tile.y >= uTiles.y) return 1.0;
	return texture2D(uMask, vec2((tile.x + 0.5) / uTiles.x, 1.0 - (tile.y + 0.5) / uTiles.y)).r;
}
float land(vec2 tile) { return step(mask(tile), 0.25); }

void main() {
	vec2 px = floor(vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uTiles * 16.0);
	vec2 tile = floor(px / 16.0);
	if (mask(tile) < 0.75) { gl_FragColor = vec4(0.0); return; }
	// Shore tiles have the beach and LimeZu's own foam in their art: leave them be.
	float shore = 0.0;
	for (int dy = -1; dy <= 1; dy++) {
		for (int dx = -1; dx <= 1; dx++) shore = max(shore, land(tile + vec2(float(dx), float(dy))));
	}
	if (shore > 0.5) { gl_FragColor = vec4(0.0); return; }

	// Ripples: thin light lines that drift across the water and bend a little.
	float wave = sin(px.y * 0.55 + uTime * 1.1 + sin(px.x * 0.09 + uTime * 0.6) * 2.4);
	float ripple = step(0.965, wave) * step(0.5, fract(px.x / 6.0 + floor(px.y / 2.0) * 0.5));

	// Glints: short bright dashes in sparse cells, a new pattern every so often.
	vec2 cell = floor(px / vec2(5.0, 3.0));
	float h = hash(cell + floor(uTime * 0.7 + hash(cell) * 3.0));
	float glint = step(0.982, h) * step(mod(px.x, 5.0), 2.0) * step(mod(px.y, 3.0), 0.5);

	vec3 glintColor = mix(vec3(1.0, 0.98, 0.9), vec3(0.85, 0.9, 1.0), uDark);
	// Ripples take the sky's colour (rose at dusk, blue at night); glints stay bright.
	vec3 color = mix(uSky, vec3(1.0), 0.4);
	float alpha = ripple * (0.32 - 0.1 * uDark);
	color = mix(color, glintColor, glint);
	alpha = max(alpha, glint * 0.75);
	gl_FragColor = vec4(color * alpha, alpha);
}
`;

/** Sky colour reflected in the water, from the time of day's tint. */
function skyColor(light: Daylight): [number, number, number] {
	const day: [number, number, number] = [0.78, 0.92, 1.0];
	const rgb = [(light.tint >> 16) & 255, (light.tint >> 8) & 255, light.tint & 255].map((v) => v / 255);
	return day.map((d, i) => d * rgb[i]) as [number, number, number];
}

export class Water {
	private readonly shader: Phaser.GameObjects.Shader;
	private light: Daylight;

	/** Null when there is no water on the map, or no WebGL to draw it with. */
	static create(scene: Phaser.Scene, layer: Phaser.Tilemaps.LayerData | undefined, light: () => Daylight): Water | null {
		if (!layer || scene.game.renderer.type !== Phaser.WEBGL) return null;
		const { width, height } = layer;
		if (scene.textures.exists(MASK_KEY)) scene.textures.remove(MASK_KEY);
		const canvas = scene.textures.createCanvas(MASK_KEY, width, height)!;
		const ctx = canvas.getContext();
		let any = false;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const tile = layer.data[y][x];
				if (tile.index < 0) continue;
				// Open water (the reserved collision tile) full red, covered sea half.
				ctx.fillStyle = tile.properties?.collides ? "#ff0000" : "#800000";
				ctx.fillRect(x, y, 1, 1);
				any = true;
			}
		}
		canvas.refresh();
		canvas.setFilter(Phaser.Textures.FilterMode.NEAREST);
		return any ? new Water(scene, width, height, light) : null;
	}

	private constructor(
		scene: Phaser.Scene,
		widthTiles: number,
		heightTiles: number,
		private readonly daylight: () => Daylight,
	) {
		this.light = daylight();
		this.shader = scene.add
			.shader(
				{
					name: "FjordWater",
					fragmentSource: FRAGMENT,
					setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
						setUniform("uMask", 0);
						setUniform("uTiles", [widthTiles, heightTiles]);
						setUniform("uTime", scene.time.now / 1000);
						setUniform("uSky", skyColor(this.light));
						setUniform("uDark", this.light.dark);
					},
				},
				0,
				0,
				widthTiles * TILE,
				heightTiles * TILE,
				[MASK_KEY],
			)
			.setOrigin(0)
			// Over the sea tiles, under anything standing on the map.
			.setDepth(-0.9);
	}

	update(): void {
		this.light = this.daylight();
	}

	destroy(): void {
		this.shader.destroy();
	}
}
