// A 3×5 pixel font for scores and short labels on the cabinet screens, so the games
// need no web font inside their canvas.

const GLYPHS: Record<string, string> = {
	"0": "111101101101111",
	"1": "010110010010111",
	"2": "111001111100111",
	"3": "111001111001111",
	"4": "101101111001001",
	"5": "111100111001111",
	"6": "111100111101111",
	"7": "111001010010010",
	"8": "111101111101111",
	"9": "111101111001111",
	A: "010101111101101",
	B: "110101110101110",
	C: "011100100100011",
	D: "110101101101110",
	E: "111100110100111",
	G: "011100101101011",
	H: "101101111101101",
	I: "111010010010111",
	K: "101101110101101",
	L: "100100100100111",
	M: "101111111101101",
	N: "110101101101101",
	O: "010101101101010",
	P: "110101110100100",
	R: "110101110101101",
	S: "011100010001110",
	T: "111010010010010",
	U: "101101101101111",
	V: "101101101101010",
	W: "101101111111101",
	X: "101101010101101",
	Y: "101101010010010",
	":": "000010000010000",
	"-": "000000111000000",
	" ": "000000000000000",
};

/** Draw `text` (upper case) with its top-left at (x, y), `scale` pixels per font pixel. Returns its width. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1): number {
	ctx.fillStyle = color;
	let cx = x;
	for (const ch of text.toUpperCase()) {
		const bits = GLYPHS[ch] ?? GLYPHS[" "];
		for (let i = 0; i < 15; i++) if (bits[i] === "1") ctx.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
		cx += 4 * scale;
	}
	return cx - x - scale;
}

export const textWidth = (text: string, scale = 1) => text.length * 4 * scale - scale;
