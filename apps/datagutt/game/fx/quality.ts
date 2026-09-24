// Effects quality (docs/game/PLAN.md M5.9). "high" has the water and aurora shaders and
// full weather; "low" drops the shaders and thins the weather. The "auto" setting starts
// high and watches the first seconds on each map: if frames run slow it drops to low for
// the rest of the visit.
import type { EffectsSetting } from "../save/save";

export type Quality = "high" | "low";

/** Frames slower than this on average (45 fps) mean the device is struggling. */
const SLOW_FRAME_MS = 1000 / 45;
/** Seconds of frames to judge by, after a moment to let the map settle. */
const SETTLE_MS = 1500;
const WINDOW_MS = 4000;

export function qualityFor(setting: EffectsSetting, autoLow: boolean): Quality {
	if (setting === "auto") return autoLow ? "low" : "high";
	return setting;
}

/** Watches frame times; `slow` turns true once, if the window averaged too slow. */
export class FrameWatch {
	private elapsed = 0;
	private frames = 0;
	private measured = 0;
	private decided = false;
	slow = false;

	/** Feed each frame's real duration. Returns true on the frame it decides "slow". */
	sample(dtMs: number): boolean {
		if (this.decided) return false;
		this.elapsed += dtMs;
		if (this.elapsed < SETTLE_MS) return false;
		this.frames++;
		this.measured += dtMs;
		if (this.measured < WINDOW_MS) return false;
		this.decided = true;
		this.slow = this.measured / this.frames > SLOW_FRAME_MS;
		return this.slow;
	}
}
