import Phaser from "phaser";
import { SERVICES_KEY, type GameServices } from "../boot";
import { EMOTE_FRAME } from "../ui/emotes";
import { nowDoing } from "../live/datagutt";
import { CHARACTERS } from "../assets/manifest";
import {
	ANIMS,
	DIRECTIONS,
	FRAME_HEIGHT,
	FRAME_WIDTH,
	PORTRAIT_ANIMS,
	PORTRAIT_CROP,
	animFrames,
	animKey,
	portraitFrames,
	portraitKey,
	type AnimName,
	type PortraitAnim,
} from "../characters/sheet";
import { DialogueRunner } from "../dialogue/DialogueRunner";
import { Progress, PROGRESS_KEY } from "../progress/Progress";
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

		this.load.image("tiles:world", "tilesets/world.png");
		this.load.bitmapFont("pixel", "fonts/pixel.png", "fonts/pixel.xml");
		this.load.image("ui:frame", "ui/frame.png");
		this.load.spritesheet("ui:emotes", "ui/emotes.png", { frameWidth: EMOTE_FRAME, frameHeight: EMOTE_FRAME });
		for (const [id, recipe] of Object.entries(CHARACTERS)) {
			this.load.spritesheet(`char:${id}`, `characters/${id}.png`, { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
			if (!("portrait" in recipe && recipe.portrait === false)) {
				const size = PORTRAIT_CROP.size;
				this.load.spritesheet(portraitKey(id), `portraits/${id}.png`, { frameWidth: size, frameHeight: size });
			}
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
		for (const [id, recipe] of Object.entries(CHARACTERS)) {
			if ("portrait" in recipe && recipe.portrait === false) continue;
			for (const anim of Object.keys(PORTRAIT_ANIMS) as PortraitAnim[]) {
				this.anims.create({
					key: portraitKey(id, anim),
					frames: this.anims.generateFrameNumbers(portraitKey(id), { frames: portraitFrames(anim) }),
					frameRate: PORTRAIT_ANIMS[anim].frameRate,
					repeat: PORTRAIT_ANIMS[anim].repeat,
				});
			}
		}
		// One story for the whole game, so visit counts survive map changes and reloads.
		const saved = loadSave(browserStorage());
		const progress = new Progress(saved);
		this.registry.set(PROGRESS_KEY, progress);
		this.sound.mute = progress.settings.muted;
		const runner = new DialogueRunner(this.cache.json.get("dialogue"), {
			world: services.world,
			hasStamp: (place) => progress.hasStamp(place),
			lanyardActivity: () => nowDoing(services.presence.current),
		}, saved?.dialogue.main);
		this.registry.set(DIALOGUE_KEY, runner);

		services.onProgress(1);
		services.onReady();
		services.startRequested.then(() => this.scene.start("World", services.start));
	}
}
