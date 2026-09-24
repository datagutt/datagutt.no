// Smallest lossless PNG for pixel art: an indexed (palette) PNG when the image has 256
// colours or fewer, else the best truecolour compression. The palette version is checked
// pixel for pixel before it is used, so nothing ever changes colour.
import sharp from "sharp";

export async function shrinkPng(input) {
	const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const colours = new Set();
	for (let i = 0; i < data.length && colours.size <= 256; i += 4) colours.add(data.readUInt32LE(i));
	const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
	const truecolour = await sharp(data, raw).png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true }).toBuffer();
	if (colours.size > 256) return truecolour;
	const indexed = await sharp(data, raw).png({ palette: true, colours: colours.size, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
	const back = await sharp(indexed).ensureAlpha().raw().toBuffer();
	const lossless = back.equals(data);
	return lossless && indexed.length < truecolour.length ? indexed : truecolour;
}
