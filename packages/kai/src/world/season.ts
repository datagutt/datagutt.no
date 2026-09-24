// Seasons. Outdoor maps are generated in summer; for every
// other season the generator writes a swap table (tile id → seasonal tile id, 0 to
// clear) as a map property, and the game applies it when it loads the map.

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
/** The seasons that differ from the generated (summer) map. */
export type ChangedSeason = Exclude<Season, "summer">;
export const CHANGED_SEASONS: ChangedSeason[] = ["spring", "autumn", "winter"];

export const isSeason = (value: unknown): value is Season => SEASONS.includes(value as Season);

/**
 * The season on `date` in the game's time zone, northern hemisphere: Dec–Feb winter,
 * Mar–May spring, Jun–Aug summer, Sep–Nov autumn.
 */
export function seasonOn(date: Date, timeZone: string): Season {
	const month = Number(new Intl.DateTimeFormat("en-GB", { month: "numeric", timeZone }).format(date));
	const byQuarter: Season[] = ["winter", "spring", "summer", "autumn"];
	return byQuarter[Math.floor((month % 12) / 3)];
}

/** Today's season in the game's time zone, or the one asked for with `?debug&season=<name>`. */
export function resolveSeason(search: string, timeZone: string, now = new Date()): Season {
	const params = new URLSearchParams(search);
	const asked = params.has("debug") ? params.get("season") : null;
	return isSeason(asked) ? asked : seasonOn(now, timeZone);
}

/** The map property holding a season's swap table. */
export const seasonProperty = (season: ChangedSeason) => `season:${season}`;

/** A swap table as "from:to,from:to" (gids without flip bits). */
export function formatSeasonTable(table: Map<number, number>): string {
	return [...table].sort(([a], [b]) => a - b).map(([from, to]) => `${from}:${to}`).join(",");
}

export function parseSeasonTable(value: string): Map<number, number> {
	const table = new Map<number, number>();
	for (const pair of value.split(",")) {
		const [from, to] = pair.split(":").map(Number);
		if (Number.isInteger(from) && Number.isInteger(to)) table.set(from, to);
	}
	return table;
}

/** Tiled keeps a tile's flips in the top three bits of its gid. */
const FLIP_BITS = 0x20000000;

type MapJson = { properties?: { name: string; value: unknown }[]; layers: { type: string; data?: number[] }[] };

/**
 * A copy of a Tiled map (JSON) as it looks in `season`: tile layers run through the
 * season's swap table, flips kept. Maps without a table (interiors) come back as they are.
 */
export function applySeason<T extends MapJson>(map: T, season: Season): T {
	if (season === "summer") return map;
	const value = map.properties?.find((p) => p.name === seasonProperty(season))?.value;
	if (typeof value !== "string") return map;
	const table = parseSeasonTable(value);
	const layers = map.layers.map((layer) => {
		if (layer.type !== "tilelayer" || !layer.data) return layer;
		const data = layer.data.map((gid) => {
			const id = gid % FLIP_BITS;
			const to = table.get(id);
			if (to === undefined) return gid;
			return to === 0 ? 0 : gid - id + to;
		});
		return { ...layer, data };
	});
	return { ...map, layers };
}
