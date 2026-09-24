import { WORLD_STATE_ELEMENT_ID } from "@datagutt/kai-live";

/**
 * Embeds live data as JSON for the game to read at boot (@datagutt/kai-live
 * readWorldState). "<" is escaped so no value (a repo description, say) can close the tag.
 */
export function LiveDataScript({ data }: { data: object }) {
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	return <script id={WORLD_STATE_ELEMENT_ID} type="application/json" dangerouslySetInnerHTML={{ __html: json }} />;
}
