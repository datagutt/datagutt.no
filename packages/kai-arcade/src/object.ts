// An arcade cabinet on a map: interact to play `game`, an id in the game's arcade
// registry. No Phaser here, so map builders and the build can import it.
import { defineMapObject } from "@datagutt/kai/world/objects";

export const arcadeObject = defineMapObject("arcade", { props: { game: "string" }, placement: "fixture" });
