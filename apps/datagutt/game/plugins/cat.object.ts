// The hidden cat's map object: it lies across its tile and the next one east. No Phaser
// here, so the map builders and the build can import it.
import { defineMapObject } from "@datagutt/kai/world/objects";

export const catObject = defineMapObject("cat", { placement: "standing", size: { w: 2, h: 1 } });
