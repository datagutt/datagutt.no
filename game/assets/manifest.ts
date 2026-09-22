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
} satisfies Record<string, CharacterRecipe>;

export type CharacterId = keyof typeof CHARACTERS;
