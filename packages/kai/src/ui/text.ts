// Word wrapping and paging for dialogue, measured with the bitmap font's real advances.

export type Measure = (text: string) => number;

/** Wrap on spaces; words longer than a line are broken by character. Keeps "\n". */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
	const lines: string[] = [];
	for (const paragraph of text.split("\n")) {
		let line = "";
		for (const word of paragraph.split(/ +/).filter(Boolean)) {
			const candidate = line ? `${line} ${word}` : word;
			if (measure(candidate) <= maxWidth) {
				line = candidate;
				continue;
			}
			if (line) lines.push(line);
			// A single word wider than the box: hard-break it.
			let rest = word;
			while (measure(rest) > maxWidth) {
				let cut = rest.length - 1;
				while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--;
				lines.push(rest.slice(0, cut));
				rest = rest.slice(cut);
			}
			line = rest;
		}
		lines.push(line);
	}
	return lines;
}

/**
 * Choices wrapped to `maxWidth`: every line, and the line each choice starts on (long
 * choices take more than one line; the cursor and taps go by choice, not by line).
 */
export function wrapChoices(choices: string[], maxWidth: number, measure: Measure): { lines: string[]; first: number[] } {
	const lines: string[] = [];
	const first: number[] = [];
	for (const choice of choices) {
		first.push(lines.length);
		lines.push(...wrapText(choice, maxWidth, measure));
	}
	return { lines, first };
}

/** Which choice a line of `wrapChoices` output belongs to. */
export function choiceOfLine(first: number[], line: number): number {
	let choice = 0;
	while (choice + 1 < first.length && first[choice + 1] <= line) choice++;
	return choice;
}

/** Group wrapped lines into pages of at most `linesPerPage`. */
export function paginate(lines: string[], linesPerPage: number): string[][] {
	const pages: string[][] = [];
	for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
	return pages.length ? pages : [[""]];
}

/** Typewriter pacing: characters per second, with a beat after punctuation. */
export const BASE_CHAR_MS = 20;
const PAUSE_AFTER: Record<string, number> = { ".": 220, "!": 220, "?": 220, "…": 320, ",": 110, ";": 110, ":": 110, "—": 140 };

/** How long to wait before revealing character `i` of `text`. */
export function charDelayMs(text: string, i: number): number {
	const prev = i > 0 ? text[i - 1] : "";
	// Only pause at the end of a clause, not inside "3.5" or "...".
	const next = text[i] ?? "";
	const pause = PAUSE_AFTER[prev] && (next === " " || next === "\n") ? PAUSE_AFTER[prev] : 0;
	return BASE_CHAR_MS + pause;
}
