import { describe, expect, it } from "vitest";
import { MP3_DELAY, loopBounds, withRoll } from "./music.mjs";

/** Mono test signal: `frames` frames, loud unless `quiet` says otherwise. */
const signal = (frames, quiet = () => false) => Float32Array.from({ length: frames }, (_, i) => (quiet(i) ? 0 : 0.5));

describe("loopBounds", () => {
	it("skips the codec delay of a header-less MP3 and the padding behind the music", () => {
		const frames = 1152 * 10;
		const pcm = signal(frames, (i) => i < MP3_DELAY || i >= frames - 700);
		expect(loopBounds(pcm, 1)).toEqual({ start: MP3_DELAY, end: frames - 700 });
	});

	it("keeps a rest the composer wrote: at most two frames are padding", () => {
		const frames = 1152 * 10;
		const pcm = signal(frames, (i) => i < MP3_DELAY || i >= frames - 9000);
		expect(loopBounds(pcm, 1)).toEqual({ start: MP3_DELAY, end: frames - 2304 });
	});

	it("leaves the start alone when the decoder already trimmed the delay", () => {
		expect(loopBounds(signal(5000), 1)).toEqual({ start: 0, end: 5000 });
	});
});

describe("withRoll", () => {
	it("wraps the loop's tail in front and its head behind, scaled", () => {
		const pcm = Float32Array.from([9, 1, 2, 3, 4, 5, 9]);
		expect([...withRoll(pcm, { start: 1, end: 6 }, 2, 2, 1)]).toEqual([8, 10, 2, 4, 6, 8, 10, 2, 4]);
	});

	it("keeps stereo channels apart", () => {
		const pcm = Float32Array.from([1, -1, 2, -2, 3, -3]);
		expect([...withRoll(pcm, { start: 0, end: 3 }, 1, 1, 2)]).toEqual([3, -3, 1, -1, 2, -2, 3, -3, 1, -1]);
	});
});
