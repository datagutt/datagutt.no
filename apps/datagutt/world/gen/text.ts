// The copy a map builder places (content/mapText.json): sign texts and what a shut door
// says. Positions stay in the builders; the words live with the rest of the content.
import { content } from "../../content/index.ts";

const used = new Set<string>();

/** A map's copy by key, for that map's builder. A missing key fails the map build. */
export function mapText(map: string): (key: string) => string {
	return (key) => {
		const text = content.mapText.signs[map]?.[key];
		if (text === undefined) throw new Error(`No text "${key}" for map "${map}" in content/mapText.json`);
		used.add(`${map}.${key}`);
		return text;
	};
}

/** Every `map.key` a builder has asked for since the process started. */
export const usedMapText = (): ReadonlySet<string> => used;
