// LimeZu terrain blocks as autotile sets. Each block is 7×4 tiles:
//   cols 0-2, rows 0-2  a patch: outer corners, edges and centre
//   cols 3-4, rows 0-1  inner corners (the patch's region continues diagonally except one corner)
//   cols 5-6            diagonals (unused: the generator keeps regions free of them)
import type { AutotileSet, Piece, TileRef } from "@datagutt/kai-worldgen/autotile";

export type Block = { sheet: string; col: number; row: number };

const OFFSETS: Record<Piece, [number, number]> = {
	nw: [0, 0],
	n: [1, 0],
	ne: [2, 0],
	w: [0, 1],
	center: [1, 1],
	e: [2, 1],
	sw: [0, 2],
	s: [1, 2],
	se: [2, 2],
	// The 2×2 of inner corners: each tile is missing the corner that faces the middle
	// of the 2×2, i.e. (3,0) lacks its bottom-right: the region's outside is to its SE.
	inner_se: [3, 0],
	inner_sw: [4, 0],
	inner_ne: [3, 1],
	inner_nw: [4, 1],
};

export function pieceTile(block: Block, piece: Piece): TileRef {
	const [dx, dy] = OFFSETS[piece];
	return { sheet: block.sheet, col: block.col + dx, row: block.row + dy };
}

const PIECES = Object.keys(OFFSETS) as Piece[];

/** A LimeZu 7×4 terrain block as a set. */
export function blockSet(block: Block): AutotileSet {
	return Object.fromEntries(PIECES.map((p) => [p, [pieceTile(block, p)]])) as AutotileSet;
}

/**
 * LimeZu's animated sea (frame 0): a 4×4 pool with two variants per edge and four centre
 * tiles, plus a 2×2 of inner corners in a separate sheet.
 */
export function seaSet(sheet: string, cornersSheet: string): AutotileSet {
	const t = (col: number, row: number, s = sheet) => ({ sheet: s, col, row });
	return {
		nw: [t(0, 0)],
		n: [t(1, 0), t(2, 0)],
		ne: [t(3, 0)],
		w: [t(0, 1), t(0, 2)],
		center: [t(1, 1), t(2, 1), t(1, 2), t(2, 2)],
		e: [t(3, 1), t(3, 2)],
		sw: [t(0, 3)],
		s: [t(1, 3), t(2, 3)],
		se: [t(3, 3)],
		inner_se: [t(0, 0, cornersSheet)],
		inner_sw: [t(1, 0, cornersSheet)],
		inner_ne: [t(0, 1, cornersSheet)],
		inner_nw: [t(1, 1, cornersSheet)],
	};
}

