// Boots the game straight into the world for the standalone dev harness.
import { bootGame } from "../boot";

const container = document.getElementById("game");
if (!container) throw new Error("#game container missing");

const handle = bootGame(container, { autoStart: true });
(window as unknown as { __game: typeof handle }).__game = handle;
