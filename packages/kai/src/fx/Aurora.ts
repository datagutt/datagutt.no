// Northern lights (apps/datagutt/docs/PLAN.md M5.3). The game looks straight down, so the aurora is
// what you would glimpse overhead: curtains of light in the site's greens, drifting down
// from the top of the screen on dark nights outdoors, strongest in winter and gone in the
// light summer nights. Added over the world (and reflected in the fjord's ripples,
// fx/Water.ts). Reduced motion slows the drift.
import Phaser from "phaser";
import type { Season } from "../world/season.ts";
import { LIGHT_DEPTH } from "./Lights.ts";

/** How bright the aurora gets in each season, on the darkest night. */
const SEASON_STRENGTH: Record<Season, number> = { winter: 1, autumn: 0.7, spring: 0.45, summer: 0 };

const FRAGMENT = `
precision mediump float;
uniform vec2 uSize;
uniform float uTime;
uniform float uStrength;
varying vec2 outTexCoord;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }

void main() {
	// Whole pixels, in two-pixel columns, so the curtains read as pixel art.
	vec2 px = floor(vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uSize);
	float x = floor(px.x / 2.0) * 2.0;
	float y = px.y / uSize.y;

	// A curtain hanging from the top of the screen: its lower hem sways, and bright rays
	// run down it.
	float sway = noise(x * 0.012 + uTime * 0.05) * 0.12 + noise(x * 0.004 - uTime * 0.03) * 0.14;
	float hem = 0.08 + sway;
	float band = 1.0 - smoothstep(hem, hem + 0.12, y);
	float ray = noise(x * 0.11 + uTime * 0.35) * noise(x * 0.27 - uTime * 0.2);
	float glow = band * (0.5 + 0.9 * ray);

	// Violet at the top, teal, then the site's green along the hem.
	vec3 green = vec3(0.114, 0.776, 0.447);
	vec3 teal = vec3(0.2, 0.75, 0.8);
	vec3 violet = vec3(0.55, 0.35, 0.85);
	vec3 color = mix(mix(violet, teal, smoothstep(0.0, 0.06, y)), green, smoothstep(0.04, hem, y));

	// In a few flat steps, like the rest of the art.
	float a = floor(clamp(glow, 0.0, 1.0) * uStrength * 0.55 * 8.0) / 8.0;
	gl_FragColor = vec4(color * a, a);
}
`;

export class Aurora {
	private readonly shader: Phaser.GameObjects.Shader;
	/** 0 when there is no aurora now, up to 1; also read by the water's reflection. */
	strength = 0;

	/** Null without WebGL. */
	static create(scene: Phaser.Scene, season: Season, reducedMotion: boolean): Aurora | null {
		return scene.game.renderer.type === Phaser.WEBGL ? new Aurora(scene, season, reducedMotion) : null;
	}

	private constructor(
		scene: Phaser.Scene,
		private readonly season: Season,
		reducedMotion: boolean,
	) {
		const cam = scene.cameras.main;
		const speed = reducedMotion ? 0.25 : 1;
		this.shader = scene.add
			.shader(
				{
					name: "Aurora",
					fragmentSource: FRAGMENT,
					setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
						setUniform("uSize", [this.shader.width, this.shader.height]);
						setUniform("uTime", (scene.time.now / 1000) * speed);
						setUniform("uStrength", this.strength);
					},
				},
				0,
				0,
				cam.width,
				cam.height,
			)
			.setOrigin(0)
			.setScrollFactor(0)
			.setBlendMode(Phaser.BlendModes.ADD)
			.setDepth(LIGHT_DEPTH + 1)
			.setVisible(false);
	}

	resize(width: number, height: number): void {
		this.shader.setSize(width, height);
	}

	/** `dark` is how dark it is (0 day, 1 night); `boost` forces a full show (the finale). */
	update(dark: number, boost = false): void {
		const night = Math.max(0, (dark - 0.6) / 0.4);
		this.strength = boost ? 1 : night * SEASON_STRENGTH[this.season];
		this.shader.setVisible(this.strength > 0.01);
	}

	destroy(): void {
		this.shader.destroy();
	}
}
