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
	// Interiors
	roomBuilder: "interiors/Room_Builder_16x16.png",
	rbWalls: "interiors/Room_Builder_subfiles/Room_Builder_Walls_16x16.png",
	rbFloors: "interiors/Room_Builder_subfiles/Room_Builder_Floors_16x16.png",
	generic: "interiors/Theme_Sorter/1_Generic_16x16.png",
	living: "interiors/Theme_Sorter/2_LivingRoom_16x16.png",
	bathroom: "interiors/Theme_Sorter/3_Bathroom_16x16.png",
	bedroom: "interiors/Theme_Sorter/4_Bedroom_16x16.png",
	classroom: "interiors/Theme_Sorter/5_Classroom_and_library_16x16.png",
	fishing: "interiors/Theme_Sorter/9_Fishing_16x16.png",
	kitchen: "interiors/Theme_Sorter/12_Kitchen_16x16.png",
	conference: "interiors/Theme_Sorter/13_Conference_Hall_16x16.png",
	basement: "interiors/Theme_Sorter/14_Basement_16x16.png",
	// Modern Office pack: the furniture sheet ("office" is the exterior office building).
	workplace: "office/Modern_Office_16x16.png",
	officeRooms: "office/Room_Builder_Office_16x16.png",
	grocery: "interiors/Theme_Sorter/16_Grocery_store_16x16.png",
	museum: "interiors/Theme_Sorter/22_Museum.png",
	studio: "interiors/Theme_Sorter/23_Television_and_Film_Studio.png",
	upstairs: "interiors/Theme_Sorter/17_Visibile_Upstairs_System_16x16.png",
	gym: "interiors/Theme_Sorter/8_Gym_16x16.png",
	sea: "exteriors/Animated_16x16/Animated_Terrains_16x16/Sea_Water_Tileset_Basic_16x16.png",
	seaCorners: "exteriors/Animated_16x16/Animated_Terrains_16x16/Sea_Water_Tileset_Outer_Corners_16x16.png",
} as const;

export type SheetId = keyof typeof SHEETS;

/**
 * LimeZu's "Singles": every object in a sheet as its own PNG. `bun run world:catalog` finds
 * where each one sits in its sheet (world/art/catalog/), so prefabs can be whole objects
 * instead of hand-measured rectangles. Sheets without singles get sprites detected from
 * their pixels instead.
 */
export const SINGLES: Partial<Record<SheetId, string>> = {
	terrain: "exteriors/ME_Theme_Sorter_16x16/1_Terrains_and_Fences_Singles_16x16",
	city: "exteriors/ME_Theme_Sorter_16x16/2_City_Terrains_Singles_16x16",
	props: "exteriors/ME_Theme_Sorter_16x16/3_City_Props_Singles_16x16",
	buildings: "exteriors/ME_Theme_Sorter_16x16/4_Generic_Building_Singles_16x16",
	office: "exteriors/ME_Theme_Sorter_16x16/16_Office_Singles_16x16",
	garden: "exteriors/ME_Theme_Sorter_16x16/17_Garden_Singles_16x16",
	beach: "exteriors/ME_Theme_Sorter_16x16/21_Beach_Singles_16x16",
	post: "exteriors/ME_Theme_Sorter_16x16/22_Post_Office_Singles_16x16",
	houses: "exteriors/ME_Theme_Sorter_16x16/24_Additional_Houses_Singles_16x16",
	villas: "exteriors/ME_Theme_Sorter_16x16/7_Villas_Singles_16x16",
	camping: "exteriors/ME_Theme_Sorter_16x16/11_Camping_Singles_16x16",
	shops: "exteriors/ME_Theme_Sorter_16x16/9_Shopping_Center_and_Markets_Singles_16x16",
	worksite: "exteriors/ME_Theme_Sorter_16x16/8_Worksite_Singles_16x16",
	vehicles: "exteriors/ME_Theme_Sorter_16x16/10_Vehicles_Singles_16x16",
	living: "interiors/Theme_Sorter_Singles/2_Living_Room_Singles",
	bathroom: "interiors/Theme_Sorter_Singles/3_Bathroom_Singles",
	bedroom: "interiors/Theme_Sorter_Singles/4_Bedroom_Singles",
	classroom: "interiors/Theme_Sorter_Singles/5_Classroom_and_Library_Singles",
	fishing: "interiors/Theme_Sorter_Singles/9_Fishing_Singles",
	kitchen: "interiors/Theme_Sorter_Singles/12_Kitchen_Singles",
	conference: "interiors/Theme_Sorter_Singles/13_Conference_Hall_Singles",
	basement: "interiors/Theme_Sorter_Singles/14_Basement_Singles",
	workplace: "office/singles",
	grocery: "interiors/Theme_Sorter_Singles/16_Grocery_Store_Singles",
	museum: "interiors/Theme_Sorter_Singles/22_Museum_Singles",
	studio: "interiors/Theme_Sorter_Singles/23_Television_and_Film_Studio_SIngles",
	gym: "interiors/Theme_Sorter_Singles/8_Gym_Singles",
};

/** Furniture sheets without singles: their sprites are detected from the pixels. */
export const AUTO_CATALOG: SheetId[] = ["generic", "upstairs"];

/**
 * Recoloured copies of sheets: `from` with exact colour swaps (rrggbb to rrggbb, or to
 * rrggbbaa to change alpha too). Tiles reference them like any other sheet, e.g.
 * "villaRed:0,14".
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
	// The camping sheet's piers have its own flat water baked in under the planks. Clear
	// it so the animated sea shows through, and keep the darker bands as a soft shadow.
	campingDry: {
		from: "camping",
		recolor: {
			"3ca3b2": "00000000",
			"369ab0": "00000000",
			"3690ae": "00000000",
			"2987a6": "00000000",
			"2a709b": "0a1e3250",
			"22648d": "0a1e3260",
			"215c81": "0a1e3270",
		},
	},
};
