import { expect, test } from "@playwright/test";

// Grows with the game: M1.13 adds "the game boots without console errors",
// M6.1 adds /journal.
test("home page renders without page errors", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (err) => errors.push(err.message));

	const response = await page.goto("/");
	expect(response?.status()).toBeLessThan(400);
	await expect(page.locator("main")).toBeVisible();
	expect(errors).toEqual([]);
});
