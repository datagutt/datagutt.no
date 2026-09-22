import Phaser from "phaser";
import { SERVICES_KEY, type GameServices } from "../boot";
import { CHARACTERS } from "../assets/manifest";
import { ANIMS, DIRECTIONS, FRAME_HEIGHT, FRAME_WIDTH, animFrames, animKey, type AnimName } from "../characters/sheet";
import { DialogueRunner } from "../dialogue/DialogueRunner";
import { browserStorage, loadSave } from "../save/save";

export const DIALOGUE_KEY = "dialogue";

/** Loads everything the first map needs, reports progress, then waits for Start. */
export class PreloadScene extends Phaser.Scene {
	constructor() {
		super("Preload");
	}

	preload() {
		const services = this.registry.get(SERVICES_KEY) as GameServices;
		this.load.setBaseURL(services.assetBase);
		this.load.on(Phaser.Loader.Events.PROGRESS, services.onProgress);

		this.load.image("tiles:greybox", "tilesets/greybox.png");
		this.load.bitmapFont("pixel", "fonts/pixel.png", "fonts/pixel.xml");
		for (const id of Object.keys(CHARACTERS)) {
			this.load.spritesheet(`char:${id}`, `characters/${id}.png`, { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
		}
		this.load.tilemapTiledJSON(`map:${services.start.map}`, `maps/${services.start.map}.tmj`);
		this.load.json("dialogue", "dialogue/main.json");
	}

	create() {
		const services = this.registry.get(SERVICES_KEY) as GameServices;
		for (const id of Object.keys(CHARACTERS)) {
			for (const anim of Object.keys(ANIMS) as AnimName[]) {
				for (const dir of DIRECTIONS) {
					this.anims.create({
						key: animKey(id, anim, dir),
						frames: this.anims.generateFrameNumbers(`char:${id}`, { frames: animFrames(anim, dir) }),
						frameRate: ANIMS[anim].frameRate,
						repeat: ANIMS[anim].repeat,
					});
				}
			}
		}
		// One story for the whole game, so visit counts survive map changes and reloads.
		const saved = loadSave(browserStorage());
		const runner = new DialogueRunner(this.cache.json.get("dialogue"), {
			world: services.world,
			hasStamp: (place) => (loadSave(browserStorage())?.stamps ?? []).includes(place),
			lanyardActivity: () => "offline",
		}, saved?.dialogue.main);
		this.registry.set(DIALOGUE_KEY, runner);

		services.onProgress(1);
		services.onReady();
		services.startRequested.then(() => this.scene.start("World", services.start));
	}
}
