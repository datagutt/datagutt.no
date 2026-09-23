// LimeZu source sheets the world is built from, relative to limezu/ in datagutt-assets.
// Maps only store (sheet, col, row) references; pixels never enter this repository.

export const SHEETS = {
	terrain: "exteriors/ME_Theme_Sorter_16x16/1_Terrains_and_Fences_16x16.png",
	city: "exteriors/ME_Theme_Sorter_16x16/2_City_Terrains_16x16.png",
	props: "exteriors/ME_Theme_Sorter_16x16/3_City_Props_16x16.png",
	buildings: "exteriors/ME_Theme_Sorter_16x16/4_Generic_Buildings_16x16.png",
	office: "exteriors/ME_Theme_Sorter_16x16/16_Office_16x16.png",
	garden: "exteriors/ME_Theme_Sorter_16x16/17_Garden_16x16.png",
	beach: "exteriors/ME_Theme_Sorter_16x16/21_Beach_16x16.png",
	post: "exteriors/ME_Theme_Sorter_16x16/22_Post_Office_16x16.png",
	houses: "exteriors/ME_Theme_Sorter_16x16/24_Additional_Houses_16x16.png",
	villas: "exteriors/ME_Theme_Sorter_16x16/7_Villas_16x16.png",
	camping: "exteriors/ME_Theme_Sorter_16x16/11_Camping_16x16.png",
	shops: "exteriors/ME_Theme_Sorter_16x16/9_Shopping_Center_and_Markets_16x16.png",
	worksite: "exteriors/ME_Theme_Sorter_16x16/8_Worksite_16x16.png",
	vehicles: "exteriors/ME_Theme_Sorter_16x16/10_Vehicles_16x16.png",
	sea: "exteriors/Animated_16x16/Animated_Terrains_16x16/Sea_Water_Tileset_Basic_16x16.png",
	seaCorners: "exteriors/Animated_16x16/Animated_Terrains_16x16/Sea_Water_Tileset_Outer_Corners_16x16.png",
} as const;

export type SheetId = keyof typeof SHEETS;

/**
 * Recoloured copies of sheets: `from` with exact colour swaps (rrggbb, lower case).
 * Tiles reference them like any other sheet, e.g. "villaRed:0,14".
 */
export const DERIVED: Record<string, { from: SheetId; recolor: Record<string, string> }> = {
	// datagutt's house: a falu red Norwegian wooden house with a dark slate roof.
	villaRed: {
		from: "villas",
		recolor: {
			e0d0b2: "a8382a",
			d4c9b6: "963125",
			c9bfab: "86291f",
			bfae9f: "742318",
			b79b8c: "5e1c14",
			bb2328: "4a4e5c",
			d33d38: "5a5f6e",
			"911d38": "3a3d4a",
			de4e3b: "6a7080",
			ae1a2b: "43465a",
		},
	},
};
