// The sandbox's own collections beside the engine's: only its places.
import { ENGINE_COLLECTIONS, json, z, type ContentOf } from "@datagutt/kai/schema";
import { placeInfo } from "@datagutt/kai/schema/engine";

export const collections = {
	places: json(z.object({ list: z.array(placeInfo) })),
};

export type Content = ContentOf<typeof ENGINE_COLLECTIONS & typeof collections>;
