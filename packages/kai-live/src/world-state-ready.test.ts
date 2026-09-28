// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { WORLD_STATE_ELEMENT_ID, WORLD_STATE_PENDING_ID, whenWorldStateReady } from "./world-state.ts";

const settled = async (promise: Promise<void>) => {
	let done = false;
	void promise.then(() => (done = true));
	await vi.advanceTimersByTimeAsync(0);
	return done;
};

describe("whenWorldStateReady", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	it("resolves at once when nothing is pending", async () => {
		vi.useFakeTimers();
		expect(await settled(whenWorldStateReady())).toBe(true);
		document.body.innerHTML = `<script id="${WORLD_STATE_ELEMENT_ID}" type="application/json">{}</script>`;
		expect(await settled(whenWorldStateReady())).toBe(true);
	});

	it("waits until the pending marker is replaced", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `<template id="${WORLD_STATE_PENDING_ID}"></template>`;
		const ready = whenWorldStateReady();
		expect(await settled(ready)).toBe(false);

		// The streamed data lands first, still with the marker in place.
		document.body.insertAdjacentHTML("beforeend", `<script id="${WORLD_STATE_ELEMENT_ID}" type="application/json">{}</script>`);
		expect(await settled(ready)).toBe(false);

		document.getElementById(WORLD_STATE_PENDING_ID)?.remove();
		expect(await settled(ready)).toBe(true);
	});

	it("gives up after the timeout", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `<template id="${WORLD_STATE_PENDING_ID}"></template>`;
		const ready = whenWorldStateReady(document, 1000);
		await vi.advanceTimersByTimeAsync(999);
		expect(await settled(ready)).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(await settled(ready)).toBe(true);
	});
});
