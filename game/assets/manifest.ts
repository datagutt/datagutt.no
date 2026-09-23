// What the asset build produces. Read at build time by scripts/assets/build.mjs (through
// Node's type stripping, so no imports and only erasable TypeScript here) and at runtime
// by the game. Paths in recipes are relative to limezu/characters/ in datagutt-assets.

export type CharacterRecipe = {
	/** Layers in LimeZu's stacking order: body, eyes, outfit, hair, then accessories. */
	layers: string[];
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
	ferryman: {
		layers: [
			"Bodies/Body_04.png",
			"Eyes/Eyes_02.png",
			"Outfits/Outfit_17_01.png",
			"Hairstyles/Hairstyle_08_05.png",
			"Accessories/Accessory_11_Beanie_01.png",
			"Accessories/Accessory_13_Beard_05.png",
		],
		placeholder: "3d6f8e",
	},
	streamer: {
		layers: ["Bodies/Body_03.png", "Eyes/Eyes_03.png", "Outfits/Outfit_19_01.png", "Hairstyles/Hairstyle_29_04.png"],
		placeholder: "5a8fd8",
	},
	technician: {
		layers: [
			"Bodies/Body_04.png",
			"Eyes/Eyes_02.png",
			"Outfits/Outfit_16_02.png",
			"Hairstyles/Hairstyle_12_04.png",
			"Accessories/Accessory_11_Beanie_02.png",
		],
		placeholder: "e07b39",
	},
	shopkeeper: {
		layers: ["Bodies/Body_02.png", "Eyes/Eyes_04.png", "Outfits/Outfit_09_02.png", "Hairstyles/Hairstyle_11_03.png"],
		placeholder: "e8c86a",
	},
	coworker: {
		layers: ["Bodies/Body_01.png", "Eyes/Eyes_05.png", "Outfits/Outfit_13_02.png", "Hairstyles/Hairstyle_04_04.png"],
		placeholder: "a88fd0",
	},
	sysadmin: {
		layers: [
			"Bodies/Body_02.png",
			"Eyes/Eyes_06.png",
			"Outfits/Outfit_22_01.png",
			"Hairstyles/Hairstyle_01_05.png",
			"Accessories/Accessory_12_Mustache_05.png",
			"Accessories/Accessory_15_Glasses_02.png",
		],
		placeholder: "7d8594",
	},
	smith: {
		layers: [
			"Bodies/Body_07.png",
			"Eyes/Eyes_02.png",
			"Outfits/Outfit_18_01.png",
			"Hairstyles/Hairstyle_21_03.png",
			"Accessories/Accessory_13_Beard_04.png",
		],
		placeholder: "9a5a32",
	},
	librarian: {
		layers: [
			"Bodies/Body_03.png",
			"Eyes/Eyes_07.png",
			"Outfits/Outfit_12_02.png",
			"Hairstyles/Hairstyle_18_05.png",
			"Accessories/Accessory_15_Glasses_05.png",
		],
		placeholder: "b87a9a",
	},
	farmer: {
		layers: [
			"Bodies/Body_04.png",
			"Eyes/Eyes_01.png",
			"Outfits/Outfit_26_02.png",
			"Hairstyles/Hairstyle_08_03.png",
			"Accessories/Accessory_04_Snapback_06.png",
		],
		placeholder: "6f9a45",
	},
	postmaster: {
		layers: [
			"Bodies/Body_01.png",
			"Eyes/Eyes_03.png",
			"Outfits/Outfit_15_03.png",
			"Hairstyles/Hairstyle_23_02.png",
			"Accessories/Accessory_06_Policeman_Hat_02.png",
		],
		placeholder: "3b5fa8",
	},
} satisfies Record<string, CharacterRecipe>;

export type CharacterId = keyof typeof CHARACTERS;
