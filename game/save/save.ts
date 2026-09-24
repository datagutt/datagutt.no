// Versioned save in localStorage (docs/game/PLAN.md M1.10). Every read and write is
// guarded: private windows, blocked storage and corrupt data all fall back to a new game.
import type { Facing } from "../world/objects";

export const SAVE_KEY = "fjordtown.save";
export const SAVE_VERSION = 1;

export type SaveData = {
	version: typeof SAVE_VERSION;
	map: string;
	x: number;
	y: number;
	facing: Facing;
	stamps: string[];
	flags: Record<string, boolean>;
	/** Ink visit state per dialogue, stored as the runtime's JSON (M2). */
	dialogue: Record<string, string>;
	settings: { muted: boolean; music: boolean; showVisitors: boolean; reducedMotion: boolean | null; effects: EffectsSetting };
	updatedAt: string;
};

/** Shader and particle quality: "auto" starts high and drops to low if frames run slow. */
export type EffectsSetting = "auto" | "high" | "low";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const FACINGS = new Set(["right", "up", "left", "down"]);

/** A structurally valid save, or null. Unknown extra fields are dropped. */
function validate(raw: unknown): SaveData | null {
	if (typeof raw !== "object" || raw === null) return null;
	const r = raw as Record<string, unknown>;
	if (r.version !== SAVE_VERSION) return null;
	if (typeof r.map !== "string" || !r.map) return null;
	if (!Number.isInteger(r.x) || !Number.isInteger(r.y)) return null;
	if (typeof r.facing !== "string" || !FACINGS.has(r.facing)) return null;
	const stamps = Array.isArray(r.stamps) ? r.stamps.filter((s): s is string => typeof s === "string") : [];
	const flags = typeof r.flags === "object" && r.flags !== null ? (r.flags as Record<string, boolean>) : {};
	const dialogue = typeof r.dialogue === "object" && r.dialogue !== null ? (r.dialogue as Record<string, string>) : {};
	const s = (typeof r.settings === "object" && r.settings !== null ? r.settings : {}) as Record<string, unknown>;
	return {
		version: SAVE_VERSION,
		map: r.map,
		x: r.x as number,
		y: r.y as number,
		facing: r.facing as Facing,
		stamps: [...new Set(stamps)],
		flags,
		dialogue,
		settings: {
			muted: s.muted === true,
			music: s.music !== false,
			showVisitors: s.showVisitors !== false,
			reducedMotion: typeof s.reducedMotion === "boolean" ? s.reducedMotion : null,
			effects: s.effects === "high" || s.effects === "low" ? s.effects : "auto",
		},
		updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date(0).toISOString(),
	};
}

/**
 * Upgrades older save shapes. There is only version 1 so far; when the shape changes,
 * add a step here rather than discarding people's progress.
 */
function migrate(raw: unknown): unknown {
	return raw;
}

export function loadSave(storage: StorageLike | undefined): SaveData | null {
	if (!storage) return null;
	try {
		const text = storage.getItem(SAVE_KEY);
		if (!text) return null;
		return validate(migrate(JSON.parse(text)));
	} catch {
		return null;
	}
}

/** Returns false when the browser refused to store it (quota, privacy mode). */
export function writeSave(storage: StorageLike | undefined, data: Omit<SaveData, "version" | "updatedAt">): boolean {
	if (!storage) return false;
	try {
		const full: SaveData = { ...data, version: SAVE_VERSION, updatedAt: new Date().toISOString() };
		storage.setItem(SAVE_KEY, JSON.stringify(full));
		return true;
	} catch {
		return false;
	}
}

export function clearSave(storage: StorageLike | undefined): void {
	try {
		storage?.removeItem(SAVE_KEY);
	} catch {
		// Nothing to do: storage is unavailable.
	}
}

/** localStorage when the browser allows touching it, else undefined. */
export function browserStorage(): StorageLike | undefined {
	try {
		return typeof window !== "undefined" ? window.localStorage : undefined;
	} catch {
		return undefined;
	}
}
