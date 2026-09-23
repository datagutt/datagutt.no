// Renders a MapCanvas to a PNG straight from the LimeZu sheets, for reviewing generated
// maps (docs/game/PLAN.md M3.5). Needs the private art checkout.
import path from "node:path";
import sharp from "sharp";
import { SHEETS, type SheetId } from "../art/sheets.ts";
import { LAYERS, type MapCanvas } from "./canvas.ts";

const T = 16;

type Raw = { data: Buffer; width: number; height: number };

export async function renderCanvas(
	canvas: MapCanvas,
	artDir: string,
	options: { collision?: boolean; scale?: number; objects?: boolean } = {},
): Promise<Buffer> {
	const sheets = new Map<string, Raw>();
	const load = async (id: string): Promise<Raw> => {
		const cached = sheets.get(id);
		if (cached) return cached;
		const file = SHEETS[id as SheetId];
		if (!file) throw new Error(`Unknown sheet "${id}"`);
		const { data, info } = await sharp(path.join(artDir, "limezu", file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		const raw = { data, width: info.width, height: info.height };
		sheets.set(id, raw);
		return raw;
	};

	const W = canvas.width * T;
	const H = canvas.height * T;
	const out = Buffer.alloc(W * H * 4);
	for (const layer of LAYERS) {
		const cells = canvas.layers[layer];
		for (let ty = 0; ty < canvas.height; ty++) {
			for (let tx = 0; tx < canvas.width; tx++) {
				const ref = cells[ty * canvas.width + tx];
				if (!ref) continue;
				const src = await load(ref.sheet);
				for (let py = 0; py < T; py++) {
					for (let px = 0; px < T; px++) {
						const si = ((ref.row * T + py) * src.width + ref.col * T + px) * 4;
						const a = src.data[si + 3] / 255;
						if (a === 0) continue;
						const di = ((ty * T + py) * W + tx * T + px) * 4;
						for (let c = 0; c < 3; c++) out[di + c] = Math.round(src.data[si + c] * a + out[di + c] * (1 - a));
						out[di + 3] = 255;
					}
				}
			}
		}
	}

	if (options.collision) {
		for (let ty = 0; ty < canvas.height; ty++) {
			for (let tx = 0; tx < canvas.width; tx++) {
				if (!canvas.isBlocked(tx, ty)) continue;
				for (let py = 0; py < T; py += 1) {
					for (let px = 0; px < T; px += 1) {
						if ((px + py) % 4 !== 0) continue;
						const di = ((ty * T + py) * W + tx * T + px) * 4;
						out[di] = 255;
						out[di + 1] = 40;
						out[di + 2] = 40;
						out[di + 3] = 255;
					}
				}
			}
		}
	}
	if (options.objects) {
		const colours: Record<string, [number, number, number]> = { npc: [255, 220, 0], door: [0, 200, 255], sign: [255, 255, 255], spawn: [0, 255, 120] };
		for (const obj of canvas.objects) {
			const [r, g, b] = colours[obj.type] ?? [255, 0, 255];
			for (let py = 2; py < T - 2; py++) {
				for (let px = 2; px < T - 2; px++) {
					if (py > 3 && py < T - 4 && px > 3 && px < T - 4) continue;
					const di = ((obj.y * T + py) * W + obj.x * T + px) * 4;
					out[di] = r;
					out[di + 1] = g;
					out[di + 2] = b;
					out[di + 3] = 255;
				}
			}
		}
	}

	const scale = options.scale ?? 1;
	return sharp(out, { raw: { width: W, height: H, channels: 4 } })
		.resize(W * scale, H * scale, { kernel: "nearest" })
		.png()
		.toBuffer();
}
