import { WORLD_STATE_ELEMENT_ID } from "@/content/live";
import { getWorldState } from "@/lib/world-state";

/** Embeds the live world data as JSON for the game to read at boot. */
export async function WorldStateScript() {
	const state = await getWorldState();
	// Escape "<" so repo descriptions can never close the script tag.
	const json = JSON.stringify(state).replace(/</g, "\\u003c");
	return <script id={WORLD_STATE_ELEMENT_ID} type="application/json" dangerouslySetInnerHTML={{ __html: json }} />;
}
