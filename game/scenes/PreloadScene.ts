import Phaser from "phaser";
import { SERVICES_KEY, type GameServices } from "../boot";

/** Loads everything the first map needs, reports progress, then waits for Start. */
export class PreloadScene extends Phaser.Scene {
	constructor() {
		super("Preload");
	}

	preload() {
		const services = this.registry.get(SERVICES_KEY) as GameServices;
		this.load.setBaseURL(services.assetBase);
		this.load.on(Phaser.Loader.Events.PROGRESS, services.onProgress);
		// Asset list arrives with the pipeline (PLAN M1.3).
	}

	create() {
		const services = this.registry.get(SERVICES_KEY) as GameServices;
		services.onProgress(1);
		services.onReady();
		services.startRequested.then(() => this.scene.start("World"));
	}
}
