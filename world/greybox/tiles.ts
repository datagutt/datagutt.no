// Greybox tileset: simple original tiles drawn by the build, used to lay out and test
// maps before the LimeZu art pass (docs/game/PLAN.md M1.12). One ASCII character each.

export type GreyboxPattern = "flat" | "speckle" | "stripes" | "waves" | "bricks" | "planks" | "block" | "dots" | "cross";

export type GreyboxTile = {
	name: string;
	char: string;
	base: string;
	accent: string;
	pattern: GreyboxPattern;
	collides?: boolean;
};

export const GREYBOX_TILES: GreyboxTile[] = [
	{ name: "grass", char: ".", base: "5c9e4f", accent: "6fb35f", pattern: "speckle" },
	{ name: "grass_dark", char: ",", base: "4b8a42", accent: "5c9e4f", pattern: "speckle" },
	{ name: "path", char: "=", base: "c9b28a", accent: "b89f76", pattern: "speckle" },
	{ name: "sand", char: ":", base: "e3d1a1", accent: "d4bf88", pattern: "dots" },
	{ name: "water", char: "~", base: "3b6fa0", accent: "5a8fc0", pattern: "waves", collides: true },
	{ name: "deep_water", char: "w", base: "294f78", accent: "3b6fa0", pattern: "waves", collides: true },
	{ name: "wall_red", char: "H", base: "9a3328", accent: "7c2820", pattern: "planks", collides: true },
	{ name: "roof", char: "R", base: "3a2a30", accent: "4c3840", pattern: "stripes", collides: true },
	{ name: "door", char: "D", base: "5a3a22", accent: "d9a441", pattern: "block" },
	{ name: "window", char: "O", base: "9a3328", accent: "ffd27a", pattern: "block", collides: true },
	{ name: "floor_wood", char: "_", base: "a8784a", accent: "946640", pattern: "planks" },
	{ name: "floor_tile", char: "'", base: "cfcabc", accent: "bab4a4", pattern: "cross" },
	{ name: "rug", char: "r", base: "3d7a5e", accent: "4f9474", pattern: "dots" },
	{ name: "table", char: "T", base: "7a5230", accent: "8f6238", pattern: "block", collides: true },
	{ name: "counter", char: "C", base: "8a8f99", accent: "a3a9b3", pattern: "block", collides: true },
	{ name: "bookshelf", char: "B", base: "5a3a22", accent: "c75c4a", pattern: "stripes", collides: true },
	{ name: "bed", char: "b", base: "6d8fc7", accent: "e8eef7", pattern: "block", collides: true },
	{ name: "pc", char: "P", base: "2b2f3a", accent: "1dc672", pattern: "block", collides: true },
	{ name: "tree", char: "t", base: "2f6b3f", accent: "3f8551", pattern: "dots", collides: true },
	{ name: "bush", char: "u", base: "3f8551", accent: "4f9a60", pattern: "speckle", collides: true },
	{ name: "flowers", char: "*", base: "5c9e4f", accent: "f2a3c7", pattern: "dots" },
	{ name: "rock", char: "o", base: "8a8f99", accent: "6b7078", pattern: "speckle", collides: true },
	{ name: "fence", char: "#", base: "5c9e4f", accent: "8f6238", pattern: "stripes", collides: true },
	{ name: "dock", char: "d", base: "8f6238", accent: "6b4a2a", pattern: "planks" },
	{ name: "sign", char: "S", base: "5c9e4f", accent: "b58a55", pattern: "block", collides: true },
	{ name: "interior_wall", char: "|", base: "d8d2c4", accent: "bdb6a6", pattern: "bricks", collides: true },
	{ name: "void", char: "X", base: "0b1320", accent: "0b1320", pattern: "flat", collides: true },
	{ name: "cliff", char: "^", base: "6b6f7a", accent: "555964", pattern: "bricks", collides: true },
];

/** Tile id (0-based index in the tileset) by name. */
export const TILE_ID = Object.fromEntries(GREYBOX_TILES.map((t, i) => [t.name, i])) as Record<string, number>;
