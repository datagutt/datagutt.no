import { describe, expect, it } from "vitest";
import { DirectionStack } from "../input/directionStack";
import { SAVE_KEY, clearSave, loadSave, writeSave, type StorageLike } from "./save";

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
		expect(writeSave(storage, sample)).toBe(true);
		expect(loadSave(storage)).toMatchObject(sample);
		writeSave(storage, { ...sample, settings: { ...sample.settings, music: false } });
		expect(loadSave(storage)?.settings.music).toBe(false);
	});

	it("treats missing, corrupt or foreign data as no save", () => {
		expect(loadSave(memoryStorage())).toBeNull();
		expect(loadSave(memoryStorage({ [SAVE_KEY]: "{not json" }))).toBeNull();
		expect(loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 99, map: "town" }) }))).toBeNull();
		expect(loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify({ ...sample, version: 1, facing: "sideways" }) }))).toBeNull();
		expect(loadSave(undefined)).toBeNull();
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
		expect(loadSave(hostile)).toBeNull();
		expect(writeSave(hostile, sample)).toBe(false);
		expect(() => clearSave(hostile)).not.toThrow();
	});

	it("repairs sloppy fields instead of discarding progress", () => {
		const storage = memoryStorage({
			[SAVE_KEY]: JSON.stringify({ ...sample, version: 1, stamps: ["a", "a", 3], records: { blocks: -3, pool: 2.5, lines: 7 }, settings: "nope" }),
		});
		const save = loadSave(storage)!;
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
