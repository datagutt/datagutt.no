import { expect, test, type Page } from "@playwright/test";

type FjordState = {
	map: string;
	tile: { x: number; y: number };
	facing: string;
	moving: boolean;
	dialogueOpen: boolean;
	blips: number;
	audio: string;
};

const state = (page: Page) => page.evaluate(() => (window as unknown as { __fjord?: FjordState }).__fjord ?? null);

async function holdKey(page: Page, key: string, ms: number) {
	await page.keyboard.down(key);
	await page.waitForTimeout(ms);
	await page.keyboard.up(key);
}

test.describe("world", () => {
	// Keyboard play only; the phone project covers taps through the title-screen test.
	test.skip(({ isMobile }) => isMobile, "keyboard walkthrough");

	test("deep link skips the title, doors connect both ways, NPCs talk", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		await page.goto("/?at=home&debug");
		await expect(page.getByRole("heading", { name: "datagutt" })).toBeHidden();
		await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: "town", tile: { x: 9, y: 7 } });

		// Step up onto the door tile.
		await holdKey(page, "ArrowUp", 300);
		await expect.poll(() => state(page)).toMatchObject({ map: "house", tile: { x: 6, y: 7 }, facing: "up" });

		// Walk to datagutt: up two, left one, then face him.
		await holdKey(page, "ArrowUp", 480);
		await expect.poll(async () => (await state(page))?.moving).toBe(false);
		await holdKey(page, "ArrowLeft", 250);
		await expect.poll(async () => (await state(page))?.moving).toBe(false);
		const beforeTalk = await state(page);
		if (beforeTalk?.facing !== "left") await page.keyboard.press("ArrowLeft");
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(true);

		// Read through the Ink conversation (lines and a choice) until it closes.
		for (let i = 0; i < 40 && (await state(page))?.dialogueOpen; i++) {
			await page.keyboard.press("e");
			await page.waitForTimeout(250);
		}
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(false);
		// Talking makes blips once audio is unlocked (the key presses count as a gesture).
		const afterTalk = await state(page);
		if (afterTalk?.audio === "running") expect(afterTalk.blips).toBeGreaterThan(0);

		// And back out through the door.
		await holdKey(page, "ArrowRight", 250);
		await holdKey(page, "ArrowDown", 1200);
		await expect.poll(() => state(page), { timeout: 5_000 }).toMatchObject({ map: "town", tile: { x: 9, y: 7 } });
		expect(errors).toEqual([]);
	});

	test("reloading continues where the player left off", async ({ page }) => {
		await page.goto("/?at=office&debug");
		await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: "town", tile: { x: 30, y: 7 } });
		await holdKey(page, "ArrowLeft", 300);
		await expect.poll(async () => (await state(page))?.moving).toBe(false);
		const moved = await state(page);

		await page.goto("/?debug");
		await expect(page.getByRole("button", { name: /continue/i })).toBeEnabled({ timeout: 30_000 });
		await page.getByRole("button", { name: /continue/i }).click();
		await expect.poll(() => state(page)).toMatchObject({ map: "town", tile: moved!.tile });
	});
});
