// Renders a generated map (.tmj, manual layers included) to a PNG straight from the
// LimeZu sheets, for reviewing maps (docs/game/PLAN.md M3.5). Needs the private art.
import sharp from "sharp";
import { beamAlpha, glowAlpha, hexRgb } from "../../game/fx/lightShapes.ts";
import { parseMapObject, type MapObject, type TiledObject } from "../../game/world/objects.ts";
import { blitTile, type SheetCache } from "./atlas.ts";
import { CLEAR_ID, COLLISION_ID, parseKey } from "./registry.ts";
import { decodeGid, type Tmj } from "./tmj.ts";

const T = 16;

const isCollisionLayer = (name: string) => name === "collision" || name === "manual_collision";

/** Which cells block movement: generated collision, then manual blocks and clears. */
export function collisionOf(tmj: Tmj): Uint8Array {
	const blocked = new Uint8Array(tmj.width * tmj.height);
	for (const layer of tmj.layers) {
		if (!isCollisionLayer(layer.name) || !Array.isArray(layer.data)) continue;
		(layer.data as number[]).forEach((raw, i) => {
			const { gid } = decodeGid(raw);
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
	options: { collision?: boolean; scale?: number; objects?: boolean; grid?: boolean } = {},
): Promise<Buffer> {
	const W = tmj.width * T;
	const H = tmj.height * T;
	const out = { data: Buffer.alloc(W * H * 4), width: W, height: H };
	for (const layer of tmj.layers) {
		if (layer.type !== "tilelayer" || isCollisionLayer(layer.name) || !Array.isArray(layer.data)) continue;
		const data = layer.data as number[];
		const props = (layer.properties as { name: string; value: string }[] | undefined) ?? [];
		const blend = (props.find((p) => p.name === "blend")?.value ?? "normal") as "normal" | "multiply" | "add";
		for (let i = 0; i < data.length; i++) {
			const { gid, flip } = decodeGid(data[i]);
			const ref = gid ? parseKey(tiles[gid - 1] ?? "") : null;
			if (!ref) continue;
			blitTile(await sheets.get(ref.sheet), ref.col * T, ref.row * T, out, (i % tmj.width) * T, Math.floor(i / tmj.width) * T, flip, blend);
		}
	}

	// Lights, added over everything the way the game does it.
	const objects: MapObject[] = tmj.layers
		.filter((l) => l.type === "objectgroup")
		.flatMap((l) => (l.objects as TiledObject[]).map((o) => parseMapObject(o, T)));
	for (const light of objects) {
		if (light.type !== "light") continue;
		const [r, g, b] = hexRgb(light.color);
		const box =
			light.shape === "glow"
				? { x0: (light.x + 0.5 - light.radius) * T, y0: (light.y + 0.5 - light.radius) * T, w: light.radius * 2 * T, h: light.radius * 2 * T }
				: { x0: light.x * T, y0: light.y * T, w: light.w * T, h: light.h * T };
		for (let py = Math.max(0, Math.floor(box.y0)); py < Math.min(H, box.y0 + box.h); py++) {
			for (let px = Math.max(0, Math.floor(box.x0)); px < Math.min(W, box.x0 + box.w); px++) {
				const u = (px + 0.5 - box.x0) / box.w;
				const v = (py + 0.5 - box.y0) / box.h;
				const a = light.intensity * (light.shape === "glow" ? glowAlpha(u * 2 - 1, v * 2 - 1) : beamAlpha(u, v));
				if (a <= 0) continue;
				const i = (py * W + px) * 4;
				out.data[i] = Math.min(255, out.data[i] + r * a);
				out.data[i + 1] = Math.min(255, out.data[i + 1] + g * a);
				out.data[i + 2] = Math.min(255, out.data[i + 2] + b * a);
			}
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
		const colours: Record<string, number[]> = { npc: [255, 220, 0], door: [0, 200, 255], sign: [255, 255, 255], spawn: [0, 255, 120], light: [255, 150, 0] };
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
	const image = sharp(out.data, { raw: { width: W, height: H, channels: 4 } }).resize(W * scale, H * scale, { kernel: "nearest" });
	if (!options.grid) return image.png().toBuffer();
	// Faint tile grid with coordinates every 5 tiles, for talking about positions.
	const s = T * scale;
	let svg = `<svg width="${W * scale}" height="${H * scale}" xmlns="http://www.w3.org/2000/svg" font-family="monospace" font-size="${Math.max(9, 5 * scale)}">`;
	for (let x = 0; x <= tmj.width; x++) svg += `<line x1="${x * s}" y1="0" x2="${x * s}" y2="${H * scale}" stroke="#000" stroke-opacity="${x % 5 ? 0.08 : 0.3}"/>`;
	for (let y = 0; y <= tmj.height; y++) svg += `<line x1="0" y1="${y * s}" x2="${W * scale}" y2="${y * s}" stroke="#000" stroke-opacity="${y % 5 ? 0.08 : 0.3}"/>`;
	for (let y = 0; y < tmj.height; y += 5) {
		for (let x = 0; x < tmj.width; x += 5) {
			svg += `<text x="${x * s + 2}" y="${y * s + 10}" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${x},${y}</text>`;
		}
	}
	svg += "</svg>";
	const base = await image.png().toBuffer();
	return sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
}
