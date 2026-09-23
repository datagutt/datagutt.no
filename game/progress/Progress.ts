// The player's progress for this session, loaded once from the save and written back by
// the world scene. Shared through the Phaser registry under PROGRESS_KEY.
import type { SaveData } from "../save/save";
import { awardStamp, type StampResult } from "./passport";

export const PROGRESS_KEY = "progress";

type Settings = SaveData["settings"];

export class Progress {
	stamps: string[];
	flags: Record<string, boolean>;
	settings: Settings;

	constructor(saved: SaveData | null) {
		this.stamps = awardStamp(saved?.stamps ?? [], null).stamps;
		this.flags = { ...(saved?.flags ?? {}) };
		this.settings = saved?.settings ?? { muted: false, showVisitors: true, reducedMotion: null, effects: "auto" };
	}

	hasStamp(place: string): boolean {
		return this.stamps.includes(place);
	}

	stamp(place: string | null): StampResult {
		const result = awardStamp(this.stamps, place);
		this.stamps = result.stamps;
		return result;
	}

	/** Reduced motion: the explicit setting, else the OS preference. */
	get reducedMotion(): boolean {
		if (this.settings.reducedMotion !== null) return this.settings.reducedMotion;
		return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
	}
}
