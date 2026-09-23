// Renders a generated map (.tmj, manual layers included) to a PNG straight from the
// LimeZu sheets, for reviewing maps (docs/game/PLAN.md M3.5). Needs the private art.
import sharp from "sharp";
import { parseMapObject, type TiledObject } from "../../game/world/objects.ts";
import { blitTile, type SheetCache } from "./atlas.ts";
import { CLEAR_ID, COLLISION_ID, parseKey } from "./registry.ts";
import type { Tmj } from "./tmj.ts";

const T = 16;

const isCollisionLayer = (name: string) => name === "collision" || name === "manual_collision";

/** Which cells block movement: generated collision, then manual blocks and clears. */
export function collisionOf(tmj: Tmj): Uint8Array {
	const blocked = new Uint8Array(tmj.width * tmj.height);
	for (const layer of tmj.layers) {
		if (!isCollisionLayer(layer.name) || !Array.isArray(layer.data)) continue;
		(layer.data as number[]).forEach((gid, i) => {
			if (gid === COLLISION_ID + 1) blocked[i] = 1;
			if (gid === CLEAR_ID + 1) blocked[i] = 0;
		});
	}
	return blocked;
}

export async function renderTmj(
	tmj: Tmj,
	tiles: string[],
	sheets: SheetCache,
	options: { collision?: boolean; scale?: number; objects?: boolean } = {},
): Promise<Buffer> {
	const W = tmj.width * T;
	const H = tmj.height * T;
	const out = { data: Buffer.alloc(W * H * 4), width: W, height: H };
	for (const layer of tmj.layers) {
		if (layer.type !== "tilelayer" || isCollisionLayer(layer.name) || !Array.isArray(layer.data)) continue;
		const data = layer.data as number[];
		for (let i = 0; i < data.length; i++) {
			const ref = data[i] ? parseKey(tiles[data[i] - 1] ?? "") : null;
			if (!ref) continue;
			blitTile(await sheets.get(ref.sheet), ref.col * T, ref.row * T, out, (i % tmj.width) * T, Math.floor(i / tmj.width) * T);
		}
	}

	const mark = (tx: number, ty: number, rgb: readonly number[], keep: (px: number, py: number) => boolean) => {
		for (let py = 0; py < T; py++) {
			for (let px = 0; px < T; px++) {
				if (!keep(px, py)) continue;
				const di = ((ty * T + py) * W + tx * T + px) * 4;
				out.data[di] = rgb[0];
				out.data[di + 1] = rgb[1];
				out.data[di + 2] = rgb[2];
				out.data[di + 3] = 255;
			}
		}
	};
	if (options.collision) {
		collisionOf(tmj).forEach((b, i) => b && mark(i % tmj.width, Math.floor(i / tmj.width), [255, 40, 40], (px, py) => (px + py) % 4 === 0));
	}
	if (options.objects) {
		const colours: Record<string, number[]> = { npc: [255, 220, 0], door: [0, 200, 255], sign: [255, 255, 255], spawn: [0, 255, 120] };
		const ring = (px: number, py: number) => px >= 2 && py >= 2 && px < T - 2 && py < T - 2 && !(px > 3 && py > 3 && px < T - 4 && py < T - 4);
		for (const layer of tmj.layers) {
			if (layer.type !== "objectgroup") continue;
			for (const raw of layer.objects as TiledObject[]) {
				const obj = parseMapObject(raw, T);
				mark(obj.x, obj.y, colours[obj.type] ?? [255, 0, 255], ring);
			}
		}
	}

	const scale = options.scale ?? 1;
	return sharp(out.data, { raw: { width: W, height: H, channels: 4 } })
		.resize(W * scale, H * scale, { kernel: "nearest" })
		.png()
		.toBuffer();
}
