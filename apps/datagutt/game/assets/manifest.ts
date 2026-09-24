// What the asset build produces. Read at build time by scripts/assets/build.mjs (through
// Node's type stripping, so no imports and only erasable TypeScript here) and at runtime
// by the game. Paths in recipes are relative to limezu/characters/ in datagutt-assets.

/**
 * A generator layer path, or one that names the portrait layer to use instead of the
 * derived one (such as a hat's `_Small` variant, which sits on the portrait head better).
 */
export type CharacterLayer = string | { file: string; portrait: string };

export type CharacterRecipe = {
	/** Layers in LimeZu's stacking order: body, eyes, outfit, hair, then accessories. */
	layers: CharacterLayer[];
	/** Exact colour swaps (hex without #) applied to every layer, for custom hair and the like. */
	recolor?: Record<string, string>;
	/** Main colour of the stand-in sprite drawn in placeholder mode. */
	placeholder: string;
	/**
	 * Dialogue portrait layers, relative to limezu/portraits/. Omit it to derive the
	 * portrait from `layers` (the two generators share numbering); `false` for none.
	 * `recolor` applies here too.
	 */
	portrait?: string[] | false;
};

// Looks follow each NPC's job and personality in game/npcs.ts, kept apart by skin tone
// (Body_01 to 04 and 07 are the natural ones), hair and a signature colour, so they stay
// distinguishable at 1x. Check changes with `bun run characters:review`.
export const CHARACTERS = {
	/** The visitor: a traveller with a backpack. */
	player: {
		layers: [
			"Bodies/Body_03.png",
			"Eyes/Eyes_01.png",
			"Outfits/Outfit_01_05.png",
			"Hairstyles/Hairstyle_05_03.png",
			"Accessories/Accessory_03_Backpack_01.png",
		],
		portrait: false,
		placeholder: "4f8a5b",
	},
	/**
	 * datagutt, matched to public/images/avatar.png: pale skin, short flat yellow hair,
	 * black glasses, light-blue sweater. Hair and glasses are recoloured from stock.
	 */
	datagutt: {
		layers: [
			"Bodies/Body_02.png",
			"Eyes/Eyes_01.png",
			"Outfits/Outfit_14_04.png",
			"Hairstyles/Hairstyle_20_01.png",
			"Accessories/Accessory_15_Glasses_01.png",
		],
		recolor: {
			cc9659: "f7d768",
			b37b3f: "e6bb3a",
			ab6736: "c4952a",
			// Two darker hair shades only the portrait layers use.
			"9f4c25": "a8791f",
			"3f271b": "6b4e14",
			"58616f": "1b1b24",
		},
		placeholder: "e6bb3a",
	},
	/** Arne: thirty years on the fjord. Grey beard, fisherman's beanie, sailor's jumper. */
	ferryman: {
		layers: [
			"Bodies/Body_03.png",
			"Eyes/Eyes_02.png",
			"Outfits/Outfit_17_01.png",
			"Hairstyles/Hairstyle_08_05.png",
			{ file: "Accessories/Accessory_11_Beanie_01.png", portrait: "Accessories/PG_Accessory_11_Beanie_Small_1.png" },
			"Accessories/Accessory_13_Beard_04.png",
		],
		placeholder: "3d6f8e",
	},
	/** Sunniva: pink cat-ear hair (reads as a streaming headset) and a guac-green hoodie. */
	streamer: {
		layers: ["Bodies/Body_07.png", "Eyes/Eyes_03.png", "Outfits/Outfit_20_03.png", "Hairstyles/Hairstyle_28_01.png"],
		placeholder: "5c9e48",
	},
	/** Kjell: field engineer with a moustache and an orange hi-vis tee. */
	technician: {
		layers: [
			"Bodies/Body_04.png",
			"Eyes/Eyes_02.png",
			"Outfits/Outfit_16_02.png",
			"Hairstyles/Hairstyle_12_04.png",
			"Accessories/Accessory_12_Mustache_01.png",
		],
		placeholder: "e07b39",
	},
	/** Randi: ginger bun and a red kiosk apron. */
	shopkeeper: {
		layers: ["Bodies/Body_02.png", "Eyes/Eyes_04.png", "Outfits/Outfit_09_01.png", "Hairstyles/Hairstyle_11_01.png"],
		placeholder: "e06a4a",
	},
	/** Ida: office casual, a teal cardigan over a white tee. */
	coworker: {
		layers: ["Bodies/Body_01.png", "Eyes/Eyes_05.png", "Outfits/Outfit_07_03.png", "Hairstyles/Hairstyle_04_04.png"],
		placeholder: "2f8a8a",
	},
	/** Bjørn: retired sysadmin. Grey hair and beard, glasses, an old knitted vest. */
	sysadmin: {
		layers: [
			"Bodies/Body_03.png",
			"Eyes/Eyes_06.png",
			"Outfits/Outfit_22_02.png",
			"Hairstyles/Hairstyle_01_05.png",
			"Accessories/Accessory_13_Beard_04.png",
			"Accessories/Accessory_15_Glasses_01.png",
		],
		placeholder: "7d8594",
	},
	/** Tor: gym bro. Gelled blond spikes, a ginger beard and a red training tee. */
	trainer: {
		layers: [
			"Bodies/Body_03.png",
			"Eyes/Eyes_02.png",
			"Outfits/Outfit_16_03.png",
			"Hairstyles/Hairstyle_21_01.png",
			"Accessories/Accessory_13_Beard_03.png",
		],
		placeholder: "9a5a32",
	},
	/** Solveig: grey bun with a hair stick, red reading glasses, a lilac cardigan. */
	librarian: {
		layers: [
			"Bodies/Body_02.png",
			"Eyes/Eyes_07.png",
			"Outfits/Outfit_11_01.png",
			"Hairstyles/Hairstyle_11_05.png",
			"Accessories/Accessory_15_Glasses_02.png",
		],
		placeholder: "b87a9a",
	},
	/**
	 * Ola: a green farm-supply cap, denim overalls and a ginger beard. LimeZu's straw hat
	 * reads more farmer but hides his eyes in the portrait.
	 */
	farmer: {
		layers: [
			"Bodies/Body_07.png",
			"Eyes/Eyes_01.png",
			"Outfits/Outfit_26_03.png",
			"Hairstyles/Hairstyle_20_01.png",
			{ file: "Accessories/Accessory_04_Snapback_03.png", portrait: "Accessories/PG_Accessory_04_Snapback_Small_3.png" },
			"Accessories/Accessory_13_Beard_03.png",
		],
		placeholder: "4a6fa8",
	},
	/** Liv: a Posten-red uniform jacket and long dark hair. */
	postmaster: {
		layers: ["Bodies/Body_01.png", "Eyes/Eyes_03.png", "Outfits/Outfit_18_03.png", "Hairstyles/Hairstyle_09_07.png"],
		placeholder: "b8322c",
	},

	// Background coworkers at the Nettbureau office: no portrait, a one-liner each
	// (game/dialogue/ink/office.ink). Startup casual: snapbacks, beanies, hoodies.
	officeDev: {
		layers: ["Bodies/Body_02.png", "Eyes/Eyes_02.png", "Outfits/Outfit_05_02.png", "Hairstyles/Hairstyle_13_03.png", "Accessories/Accessory_04_Snapback_02.png"],
		portrait: false,
		placeholder: "3a5a8a",
	},
	officeDesigner: {
		layers: ["Bodies/Body_04.png", "Eyes/Eyes_03.png", "Outfits/Outfit_24_03.png", "Hairstyles/Hairstyle_17_03.png", "Accessories/Accessory_15_Glasses_01.png"],
		portrait: false,
		placeholder: "c46a9a",
	},
	officeSupport: {
		layers: ["Bodies/Body_07.png", "Eyes/Eyes_04.png", "Outfits/Outfit_10_03.png", "Hairstyles/Hairstyle_02_02.png"],
		portrait: false,
		placeholder: "5a9a5a",
	},
	officeGrowth: {
		layers: ["Bodies/Body_01.png", "Eyes/Eyes_07.png", "Outfits/Outfit_29_02.png", "Hairstyles/Hairstyle_24_04.png"],
		portrait: false,
		placeholder: "d88a2a",
	},
	officeData: {
		layers: ["Bodies/Body_03.png", "Eyes/Eyes_01.png", "Outfits/Outfit_19_01.png", "Hairstyles/Hairstyle_07_02.png", "Accessories/Accessory_11_Beanie_03.png", "Accessories/Accessory_13_Beard_02.png"],
		portrait: false,
		placeholder: "6a4a8a",
	},
	officeFinance: {
		layers: ["Bodies/Body_04.png", "Eyes/Eyes_05.png", "Outfits/Outfit_02_02.png", "Hairstyles/Hairstyle_26_06.png"],
		portrait: false,
		placeholder: "2a7a6a",
	},
	// The youth club (world/gen/maps/youthClub.ts): Siv runs it, two regulars hang out.
	youthWorker: {
		layers: ["Bodies/Body_03.png", "Eyes/Eyes_05.png", "Outfits/Outfit_29_02.png", "Hairstyles/Hairstyle_24_04.png", "Accessories/Accessory_15_Glasses_01.png"],
		portrait: false,
		placeholder: "8a6ac4",
	},
	clubGamer: {
		layers: ["Bodies/Body_01.png", "Eyes/Eyes_02.png", "Outfits/Outfit_19_01.png", "Hairstyles/Hairstyle_07_02.png", "Accessories/Accessory_04_Snapback_02.png"],
		portrait: false,
		placeholder: "3a8a6a",
	},
	clubLounger: {
		layers: ["Bodies/Body_07.png", "Eyes/Eyes_03.png", "Outfits/Outfit_10_03.png", "Hairstyles/Hairstyle_17_03.png", "Accessories/Accessory_11_Beanie_03.png"],
		portrait: false,
		placeholder: "c48a3a",
	},
} satisfies Record<string, CharacterRecipe>;

export type CharacterId = keyof typeof CHARACTERS;

/** A music track: a loop from datagutt-assets, path relative to its music/ folder. */
export type MusicTrack = { file: string };

// Towball's Crossing: Deluxe! by Towball, CC BY 4.0 (credited in content/credits.ts). The
// assets repo's music/towballs-crossing-deluxe/TRACKS.md says why these seven. The build
// cuts each to its exact loop and writes public/game/music/<id>.ogg and .mp3.
const DELUXE = "towballs-crossing-deluxe/Towballs Crossing Deluxe! Loopable Tracks";
export const MUSIC = {
	welcome: { file: `${DELUXE}/01 Welcome To Towballs Crossing Deluxe! (Loopable Version).mp3` },
	sunrise: { file: `${DELUXE}/02 Enjoying the Sunrise (Loopable Version).mp3` },
	market: { file: `${DELUXE}/05 At the Farmers Market (Loopable Version).mp3` },
	taxOffice: { file: `${DELUXE}/06 Tax Office (Loopable Version).mp3` },
	boredom: { file: `${DELUXE}/07 Afternoon Boredom (Loopable Version).mp3` },
	snowedIn: { file: `${DELUXE}/09 Snowed In (Loopable Version).mp3` },
	goodnight: { file: `${DELUXE}/10 Goodnight and Sweet Dreams (Loopable Version).mp3` },
} satisfies Record<string, MusicTrack>;

export type MusicId = keyof typeof MUSIC;

/** Where a built track loops, in seconds from the start of its file (assets.json `music`). */
export type MusicLoop = { loopStart: number; loopEnd: number };
