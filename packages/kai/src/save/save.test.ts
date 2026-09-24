import { describe, expect, it } from "vitest";
import { DirectionStack } from "../input/directionStack.ts";
import { clearSave, loadSave, writeSave, type StorageLike } from "./save.ts";

const SAVE_KEY = "game.save";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
	const data = { ...initial };
	return {
		data,
		getItem: (k) => data[k] ?? null,
		setItem: (k, v) => void (data[k] = v),
		removeItem: (k) => void delete data[k],
	};
}

const sample = {
	map: "town",
	x: 3,
	y: 4,
	facing: "up" as const,
	stamps: ["library"],
	flags: { metFerryman: true },
	records: { blocks: 1200 },
	dialogue: {},
	settings: { muted: false, music: true, showVisitors: true, reducedMotion: null, effects: "auto" as const },
};

describe("save", () => {
	it("round-trips", () => {
		const storage = memoryStorage();
		expect(writeSave(storage, SAVE_KEY, sample)).toBe(true);
		expect(loadSave(storage, SAVE_KEY)).toMatchObject(sample);
		writeSave(storage, SAVE_KEY, { ...sample, settings: { ...sample.settings, music: false } });
		expect(loadSave(storage, SAVE_KEY)?.settings.music).toBe(false);
	});

	it("treats missing, corrupt or foreign data as no save", () => {
		expect(loadSave(memoryStorage(), SAVE_KEY)).toBeNull();
		expect(loadSave(memoryStorage({ [SAVE_KEY]: "{not json" }), SAVE_KEY)).toBeNull();
		expect(loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 99, map: "town" }) }), SAVE_KEY)).toBeNull();
		expect(loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify({ ...sample, version: 1, facing: "sideways" }) }), SAVE_KEY)).toBeNull();
		expect(loadSave(undefined, SAVE_KEY)).toBeNull();
	});

	it("survives storage that throws", () => {
		const hostile: StorageLike = {
			getItem: () => {
				throw new Error("SecurityError");
			},
			setItem: () => {
				throw new Error("QuotaExceededError");
			},
			removeItem: () => {
				throw new Error("SecurityError");
			},
		};
		expect(loadSave(hostile, SAVE_KEY)).toBeNull();
		expect(writeSave(hostile, SAVE_KEY, sample)).toBe(false);
		expect(() => clearSave(hostile, SAVE_KEY)).not.toThrow();
	});

	it("repairs sloppy fields instead of discarding progress", () => {
		const storage = memoryStorage({
			[SAVE_KEY]: JSON.stringify({ ...sample, version: 1, stamps: ["a", "a", 3], records: { blocks: -3, pool: 2.5, lines: 7 }, settings: "nope" }),
		});
		const save = loadSave(storage, SAVE_KEY)!;
		expect(save.stamps).toEqual(["a"]);
		expect(save.records).toEqual({ lines: 7 });
		expect(save.settings).toEqual({ muted: false, music: true, showVisitors: true, reducedMotion: null, effects: "auto" });
	});
});

describe("DirectionStack", () => {
	it("uses the latest held key and falls back when it is released", () => {
		const s = new DirectionStack();
		s.press("right");
		s.press("up");
		expect(s.current).toBe("up");
		s.release("up");
		expect(s.current).toBe("right");
		s.release("right");
		expect(s.current).toBeNull();
	});
});
