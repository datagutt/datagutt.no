// The map objects live GitHub data is drawn into. No Phaser here, so map builders and the
// build can import them.
import { defineMapObject } from "@datagutt/kai/world/objects";

/** A field of crops, one tile per day; `stages` are the growth-stage tiles, smallest first. */
export const cropsObject = defineMapObject("crops", { props: { stages: "tiles" }, placement: "overlay", size: "rect" });

/** A featured shelf: one spine per pinned repo. */
export const booksObject = defineMapObject("books", { placement: "overlay", size: "rect" });
