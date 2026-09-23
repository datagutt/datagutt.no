// Distance in steps from every tile of a map to the nearest tile of some kind (open water,
// forest), for the ambience. Breadth-first over the four neighbours, walls ignored: sound
// carries over them.

export const FAR = 0xffff;

export function distanceField(width: number, height: number, isSource: (x: number, y: number) => boolean): Uint16Array {
	const dist = new Uint16Array(width * height).fill(FAR);
	const queue: number[] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (!isSource(x, y)) continue;
			dist[y * width + x] = 0;
			queue.push(y * width + x);
		}
	}
	for (let head = 0; head < queue.length; head++) {
		const i = queue[head];
		const x = i % width;
		const y = (i - x) / width;
		for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
			if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
			const j = ny * width + nx;
			if (dist[j] !== FAR) continue;
			dist[j] = dist[i] + 1;
			queue.push(j);
		}
	}
	return dist;
}
