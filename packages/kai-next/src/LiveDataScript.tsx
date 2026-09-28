import { WORLD_STATE_ELEMENT_ID, WORLD_STATE_PENDING_ID } from "@datagutt/kai-live";

/**
 * Embeds live data as JSON for the game to read at boot (@datagutt/kai-live
 * readWorldState). "<" is escaped so no value (a repo description, say) can close the tag.
 */
export function LiveDataScript({ data }: { data: object }) {
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	return <script id={WORLD_STATE_ELEMENT_ID} type="application/json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/**
 * The Suspense fallback around a streamed LiveDataScript. The page hydrates before the
 * stream ends, and useKaiGame holds the game's boot until this marker is replaced.
 */
export function LiveDataPending() {
	return <template id={WORLD_STATE_PENDING_ID} />;
}
