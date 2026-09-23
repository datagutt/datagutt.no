// The town's places and what each one presents (docs/game/DESIGN.md §5). Used for
// passport stamps, `?at=` deep links, the Journal's "visit in game" links and the
// validator that checks every piece of content has a home.

export type ContentRef =
	| { kind: "profile" }
	| { kind: "project"; id: string }
	| { kind: "experience"; id: string }
	| { kind: "skills" }
	| { kind: "repos" }
	| { kind: "stats" }
	| { kind: "contact" };

export type Place = {
	id: string;
	name: string;
	presents: ContentRef[];
	/** Gives a Fjord Passport stamp when its main NPC has been talked to. */
	stamp: boolean;
	/** Where `?at=<id>` puts the player: outside its door. */
	entrance?: { map: string; spawn: string };
};

export const places = [
	{ id: "dock", name: "Ferry dock", presents: [], stamp: false, entrance: { map: "town", spawn: "ferry" } },
	{
		id: "home",
		name: "datagutt's house",
		presents: [{ kind: "profile" }, { kind: "project", id: "portfolio" }],
		stamp: true,
		entrance: { map: "town", spawn: "house_door" },
	},
	{ id: "boathouse", name: "Boathouse studio", presents: [{ kind: "project", id: "guac" }], stamp: true, entrance: { map: "town", spawn: "boathouse_door" } },
	{ id: "radio-tower", name: "Radio tower", presents: [{ kind: "project", id: "irlserver" }], stamp: true, entrance: { map: "town", spawn: "radio_hut_door" } },
	{ id: "kiosk", name: "Kiosk", presents: [{ kind: "project", id: "donate-chat" }], stamp: true, entrance: { map: "town", spawn: "kiosk_door" } },
	{
		id: "office",
		name: "Nettbureau office",
		presents: [{ kind: "experience", id: "nettbureau" }],
		stamp: true,
		entrance: { map: "town", spawn: "office_door" },
	},
	{ id: "town-hall", name: "Town hall", presents: [{ kind: "experience", id: "iod" }], stamp: true, entrance: { map: "town", spawn: "town_hall_door" } },
	{ id: "gym", name: "Gym", presents: [{ kind: "skills" }], stamp: true, entrance: { map: "town", spawn: "gym_door" } },
	{ id: "library", name: "Library", presents: [{ kind: "repos" }], stamp: true, entrance: { map: "town", spawn: "library_door" } },
	{ id: "farm", name: "Farm", presents: [{ kind: "stats" }], stamp: true, entrance: { map: "town", spawn: "farmhouse_door" } },
	{ id: "post-office", name: "Post office", presents: [{ kind: "contact" }], stamp: true, entrance: { map: "town", spawn: "post_office_door" } },
] as const satisfies readonly Place[];

export type PlaceId = (typeof places)[number]["id"];

export const START_PLACE: PlaceId = "dock";

export function place(id: PlaceId): Place {
	return places.find((p) => p.id === id)!;
}

/** The place named by `?at=` in a URL search string, if it is known and has an entrance. */
export function placeFromSearch(search: string): Place | null {
	const at = new URLSearchParams(search).get("at")?.trim().toLowerCase();
	const found = at ? (places as readonly Place[]).find((p) => p.id === at) : undefined;
	return found?.entrance ? found : null;
}

/** The place that presents a piece of content (content.test.ts: each has exactly one). */
export function placePresenting(kind: ContentRef["kind"], id?: string): Place {
	const found = (places as readonly Place[]).find((p) => p.presents.some((r) => r.kind === kind && (!("id" in r) || r.id === id)));
	if (!found) throw new Error(`No place presents ${kind}${id ? ` "${id}"` : ""}`);
	return found;
}
