// How a LimeZu single's file name becomes its key: "Living_Room_Singles_12.png" is "12",
// "24_Additional_Houses_Country_House_16x16.png" is "Country_House". Shared by the
// catalogue builder and the atlas loader so both agree.

export function singleKeys(files: string[]): Map<string, string> {
	const stems = files.map((f) => f.replace(/\.png$/i, "").replace(/_16x16/g, ""));
	// The prefix every file in the folder shares ("24_Additional_Houses_", "Living_Room_Singles_").
	let prefix = stems[0] ?? "";
	for (const s of stems) while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
	prefix = prefix.slice(0, prefix.lastIndexOf("_") + 1);
	const keys = new Map<string, string>();
	stems.forEach((stem, i) => {
		const numbered = /_(\d+)$/.exec(stem);
		const key = numbered && /singles?_\d+$/i.test(stem) ? numbered[1] : stem.slice(prefix.length) || stem;
		keys.set(key, files[i]);
	});
	return keys;
}
