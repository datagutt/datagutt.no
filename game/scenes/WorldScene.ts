import Phaser from "phaser";
import { TILE } from "../constants";

/** The explorable world. For now: a test pattern to verify crisp scaling (PLAN M1.2). */
export class WorldScene extends Phaser.Scene {
	private marker?: Phaser.GameObjects.Rectangle;

	constructor() {
		super("World");
	}

	create() {
		const cols = 60;
		const rows = 40;
		const g = this.add.graphics();
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				g.fillStyle((x + y) % 2 ? 0x2f6b3f : 0x3b7d4a);
				g.fillRect(x * TILE, y * TILE, TILE, TILE);
				// One-pixel detail in every tile so blur or uneven pixels are obvious.
				g.fillStyle(0xe8f5e9);
				g.fillRect(x * TILE + 3, y * TILE + 3, 1, 1);
				g.fillRect(x * TILE + 5, y * TILE + 3, 2, 1);
			}
		}
		this.marker = this.add.rectangle(0, 0, TILE, TILE, 0xffd54f).setOrigin(0);
		this.cameras.main.setBounds(0, 0, cols * TILE, rows * TILE);
		this.cameras.main.startFollow(this.marker, true);
	}

	update(time: number) {
		if (!this.marker) return;
		// Slow drift so camera movement can be checked for shimmer.
		const t = time / 1000;
		this.marker.x = Math.round(300 + Math.cos(t * 0.5) * 200);
		this.marker.y = Math.round(300 + Math.sin(t * 0.5) * 150);
	}
}
