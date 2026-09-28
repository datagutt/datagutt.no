// Fjord Town's content as the engine reads it (GameData), for the app's own code outside
// the running game: the Journal's passport, the dialogue functions, tests. Deep import:
// the build loads this through the dialogue host, and the runtime's index pulls in Phaser.
import { GameData } from "@datagutt/kai/data";
import { content } from "../content/index.ts";

export const fjordContent = { ...content, places: content.places.list };

export const fjordData = new GameData(fjordContent);
