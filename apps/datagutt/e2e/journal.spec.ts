import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("journal", () => {
	test("passes an axe check, with and without a saved game", async ({ page }) => {
		await page.goto("/journal");
		await expect(page.getByRole("heading", { name: "datagutt's Journal" })).toBeVisible();
		expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

		await page.evaluate(() =>
			localStorage.setItem(
				"fjordtown.save",
				JSON.stringify({ version: 1, map: "town", x: 45, y: 26, facing: "up", stamps: ["library", "gym"], flags: {}, dialogue: {}, settings: {} }),
			),
		);
		await page.reload();
		await expect(page.getByRole("heading", { name: /your fjord passport: 2 of 10 stamps/i })).toBeVisible();
		expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
	});

	test.describe("without JavaScript", () => {
		test.use({ javaScriptEnabled: false });

		test("reads in full", async ({ page }) => {
			await page.goto("/journal");
			for (const name of ["About", "Projects", "Work", "Skills", "Open source", "Stats", "Contact", "Credits"]) {
				await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
			}
			await expect(page.getByRole("link", { name: "mail@datagutt.no" })).toBeVisible();
			await expect(page.getByText("LimeZu (limezu.itch.io)")).toBeVisible();
		});
	});

	test("links into the game at the place that tells each part", async ({ page, isMobile }) => {
		test.skip(isMobile, "the game's deep link is covered on desktop");
		await page.goto("/journal");
		await page.getByRole("link", { name: /visit the gym in the game/i }).click();
		await expect(page).toHaveURL(/\/\?at=gym$/);
		// A deep link skips the title screen and walks straight in.
		await expect(page.getByRole("heading", { name: "datagutt" })).toBeHidden({ timeout: 30_000 });
	});
});
