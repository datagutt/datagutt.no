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
	sea: "exteriors/Animated_16x16/Animated_Terrains_16x16/Sea_Water_Tileset_Basic_16x16.png",
	seaCorners: "exteriors/Animated_16x16/Animated_Terrains_16x16/Sea_Water_Tileset_Outer_Corners_16x16.png",
} as const;

export type SheetId = keyof typeof SHEETS;
