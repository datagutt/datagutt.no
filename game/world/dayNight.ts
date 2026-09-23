// Time of day (docs/game/PLAN.md M5.1), from the visitor's own clock: outdoors the world
// is tinted (a multiplied colour, fx/DayNight.ts) through dawn, day, dusk and night, and
// lights marked for the night come on as it gets dark while daylight through windows fades.

export type Phase = "dawn" | "day" | "dusk" | "night";

/** Colour multiplied over the world, and how dark it is (0 day, 1 night), by hour. */
type Key = { hour: number; tint: number; dark: number };
const NIGHT_TINT = 0x4a5890;
const KEYS: Key[] = [
	{ hour: 0, tint: NIGHT_TINT, dark: 1 },
	{ hour: 5, tint: NIGHT_TINT, dark: 1 },
	{ hour: 6.5, tint: 0xe7b7c6, dark: 0.45 },
	{ hour: 8, tint: 0xffffff, dark: 0 },
	{ hour: 17.5, tint: 0xffffff, dark: 0 },
	{ hour: 19, tint: 0xe0a4b4, dark: 0.4 },
	{ hour: 20.5, tint: NIGHT_TINT, dark: 1 },
	{ hour: 24, tint: NIGHT_TINT, dark: 1 },
];

/** The middle of each phase, for `?debug&time=<phase>`. */
const PHASE_HOURS: Record<Phase, number> = { dawn: 6.5, day: 12, dusk: 19, night: 23 };

export type Daylight = { tint: number; dark: number; phase: Phase };

const mix = (a: number, b: number, t: number) => {
	const ch = (c: number, s: number) => (c >> s) & 0xff;
	const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
	return m(16) | m(8) | m(0);
};

/**
 * The light at `hours` (0–24, fractional) in `month` (1–12). June nights stay light: the
 * midnight sun up north, a long pale dusk in the south.
 */
export function daylightAt(hours: number, month = 0): Daylight {
	const h = ((hours % 24) + 24) % 24;
	const i = KEYS.findIndex((k, n) => h >= k.hour && h < KEYS[n + 1].hour);
	const [a, b] = [KEYS[i], KEYS[i + 1]];
	const t = (h - a.hour) / (b.hour - a.hour);
	const light = { tint: mix(a.tint, b.tint, t), dark: a.dark + (b.dark - a.dark) * t, phase: phaseAt(h) };
	if (month !== MIDNIGHT_SUN) return light;
	return { ...light, tint: mix(light.tint, 0xffffff, 0.65), dark: light.dark * 0.3 };
}

const MIDNIGHT_SUN = 6;

export function phaseAt(hours: number): Phase {
	if (hours >= 5.5 && hours < 8) return "dawn";
	if (hours >= 8 && hours < 17.5) return "day";
	if (hours >= 17.5 && hours < 20.5) return "dusk";
	return "night";
}

/** `?debug&time=` as hours: a phase name or HH:MM. Null for anything else. */
export function parseTime(value: string | null): number | null {
	if (!value) return null;
	if (value in PHASE_HOURS) return PHASE_HOURS[value as Phase];
	const m = /^(\d{1,2}):(\d{2})$/.exec(value);
	if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
	return Number(m[1]) + Number(m[2]) / 60;
}

/** The month (1–12) on the visitor's clock, or `?debug&month=`. */
export function monthNow(search: string, now: () => Date = () => new Date()): () => number {
	const params = new URLSearchParams(search);
	const asked = params.has("debug") ? Number(params.get("month")) : NaN;
	return () => (Number.isInteger(asked) && asked >= 1 && asked <= 12 ? asked : now().getMonth() + 1);
}

/** Hours on the visitor's clock now, or the fixed debug time. */
export function clock(search: string, now: () => Date = () => new Date()): () => number {
	const params = new URLSearchParams(search);
	const fixed = params.has("debug") ? parseTime(params.get("time")) : null;
	return () => {
		if (fixed !== null) return fixed;
		const d = now();
		return d.getHours() + d.getMinutes() / 60;
	};
}

/** How strongly a light shines now: night lights with the dark, daylight without it. */
export function lightFactor(when: "day" | "night" | undefined, dark: number): number {
	if (when === "night") return dark;
	if (when === "day") return 1 - dark;
	return 1;
}
