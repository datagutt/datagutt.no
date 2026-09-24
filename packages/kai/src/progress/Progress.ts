// The player's progress for this session, loaded once from the save and written back by
// the world scene. Shared through the Phaser registry under PROGRESS_KEY.
import { achievementFlag, type GameData, type StampResult } from "../data.ts";
import type { SaveData } from "../save/save.ts";

export const PROGRESS_KEY = "progress";

type Settings = SaveData["settings"];

export class Progress {
	stamps: string[];
	flags: Record<string, boolean>;
	records: Record<string, number>;
	settings: Settings;

	constructor(
		saved: SaveData | null,
		private readonly data: GameData,
	) {
		this.stamps = data.awardStamp(saved?.stamps ?? [], null).stamps;
		this.flags = { ...(saved?.flags ?? {}) };
		this.records = { ...(saved?.records ?? {}) };
		this.settings = saved?.settings ?? { muted: false, music: true, showVisitors: true, reducedMotion: null, effects: "auto" };
	}

	hasStamp(place: string): boolean {
		return this.stamps.includes(place);
	}

	stamp(place: string | null): StampResult {
		const result = this.data.awardStamp(this.stamps, place);
		this.stamps = result.stamps;
		return result;
	}

	hasAchievement(id: string): boolean {
		return this.flags[achievementFlag(id)] === true;
	}

	/** Earn an achievement; true only the first time. */
	achieve(id: string): boolean {
		if (this.hasAchievement(id)) return false;
		this.flags[achievementFlag(id)] = true;
		return true;
	}

	/** Keep `value` under `name` if it beats what is there; true when it did. */
	record(name: string, value: number): boolean {
		if (value <= (this.records[name] ?? 0)) return false;
		this.records[name] = value;
		return true;
	}

	/** Reduced motion: the explicit setting, else the OS preference. */
	get reducedMotion(): boolean {
		if (this.settings.reducedMotion !== null) return this.settings.reducedMotion;
		return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
	}
}
