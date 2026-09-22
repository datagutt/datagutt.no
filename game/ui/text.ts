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

/** Group wrapped lines into pages of at most `linesPerPage`. */
export function paginate(lines: string[], linesPerPage: number): string[][] {
	const pages: string[][] = [];
	for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
	return pages.length ? pages : [[""]];
}
