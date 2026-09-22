import Phaser from "phaser";

/** First scene: sets up anything the loader itself needs, then hands over. */
export class BootScene extends Phaser.Scene {
	constructor() {
		super("Boot");
	}

	create() {
		this.scene.start("Preload");
	}
}
