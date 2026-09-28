import { expect, test, type Page } from "@playwright/test";

type KaiState = { map: string; tile: { x: number; y: number }; prompt: string | null; dialogueOpen: boolean; stamps: string[]; choices: string[] | null };

const state = (page: Page) => page.evaluate(() => (window as unknown as { __kai?: KaiState }).__kai ?? null);

test("the engine runs a game of its own: walk to the keeper, talk, get the stamp", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (err) => errors.push(err.message));
	await page.goto("/game/dev.html?debug");
	await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: "workshop", tile: { x: 7, y: 7 } });

	// Up to the keeper, who stands two tiles ahead.
	for (let i = 0; i < 10 && (await state(page))?.tile.y !== 5; i++) {
		await page.keyboard.down("ArrowUp");
		await page.waitForTimeout(120);
		await page.keyboard.up("ArrowUp");
		await page.waitForTimeout(150);
	}
	await expect.poll(async () => (await state(page))?.prompt).toBe("E Talk");

	await page.keyboard.press("e");
	await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(true);
	for (let i = 0; i < 40 && (await state(page))?.dialogueOpen; i++) {
		await page.keyboard.press("e");
		await page.waitForTimeout(200);
	}
	await expect.poll(async () => (await state(page))?.stamps).toEqual(["workshop"]);
	expect(errors).toEqual([]);
});
