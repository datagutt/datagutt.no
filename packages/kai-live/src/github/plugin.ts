// Live GitHub data drawn into the maps: a field of crops (map `crops` objects: one tile
// per day of the last weeks, crops as tall as the commits) and a featured shelf (map
// `books` objects: a spine per pinned repo, in its language colour).
import { TILE, type KaiPlugin } from "@datagutt/kai";
import type { ContributionDay, PinnedRepo } from "../github.ts";
import { fieldLevels } from "./field.ts";
import { booksObject, cropsObject } from "./objects.ts";
import { spines } from "./shelf.ts";

export function githubObjects(live: { contributions: readonly ContributionDay[]; repos: readonly PinnedRepo[] }): KaiPlugin {
	return {
		name: "github",
		objects: [
			cropsObject.place((world, area) => {
				const days = live.contributions;
				const decal = world.layers.get("decal");
				// Without live data the generator's sample crops stay.
				if (!decal || !days.length) return;
				const stages = area.stages.split(",").map(Number);
				fieldLevels(days, area.w).forEach((row, dy) => {
					if (dy >= area.h) return;
					row.forEach((level, dx) => {
						const x = area.x + dx;
						const y = area.y + dy;
						if (!level) decal.removeTileAt(x, y);
						else decal.putTileAt(stages[Math.min(level, stages.length) - 1], x, y);
					});
				});
			}),
			booksObject.place((world, area) => {
				const g = world.scene.add.graphics().setDepth(-0.5);
				for (const s of spines(live.repos, area.w * TILE, area.h * TILE - 2)) {
					const x = area.x * TILE + s.x;
					const y = area.y * TILE + s.y;
					g.fillStyle(s.edge).fillRect(x, y, s.w, s.h);
					g.fillStyle(s.color).fillRect(x, y + 1, s.w - 1, s.h - 1);
				}
			}),
		],
	};
}
