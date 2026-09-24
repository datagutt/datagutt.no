// The hidden cat (docs/game/PLAN.md B3): it lies across its tile and the next one east, and
// petting it earns "cat".
import { TILE } from "@datagutt/kai";
import { perWorld, tileKey, type KaiPlugin } from "@datagutt/kai";

export function catPlugin(): KaiPlugin {
	const cats = perWorld(() => new Set<string>());
	return {
		name: "cat",
		objects: {
			cat(world, cat) {
				for (const x of [cat.x, cat.x + 1]) {
					cats(world).add(tileKey({ x, y: cat.y }));
					world.grid.occupy(x, cat.y, "cat");
				}
				// The strip's frames are 48 wide; the cat is about 26 of that, centred at x 22.5.
				const bottom = (cat.y + 1) * TILE;
				world.scene.add.sprite((cat.x + 1) * TILE, bottom, "sprite:cat").setOrigin(22.5 / 48, 1).setDepth(bottom).play("sprite:cat");
			},
		},
		usableAt: (world, p) =>
			cats(world).has(tileKey(p)) ? { prompt: "Pet", use: () => world.playKnot("cat_petted", null, () => world.achieve("cat")) } : null,
	};
}
