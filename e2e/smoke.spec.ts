import { expect, test, type Page } from "@playwright/test";

function collectPageErrors(page: Page) {
	const errors: string[] = [];
	page.on("pageerror", (err) => errors.push(err.message));
	return errors;
}

test("title screen boots the game, and New game from its menu enters the world", async ({ page }) => {
	const errors = collectPageErrors(page);
	const response = await page.goto("/");
	expect(response?.status()).toBeLessThan(400);

	await expect(page.getByRole("heading", { name: "datagutt" })).toBeVisible();
	await page.getByRole("button", { name: /press start/i }).click();
	await expect(page.getByRole("link", { name: "Read it as a normal website" })).toBeVisible();

	const start = page.getByRole("button", { name: /new game/i });
	await expect(start).toBeEnabled({ timeout: 30_000 });
	await expect(page.locator("canvas")).toHaveCount(1);

	await start.click();
	await expect(page.getByRole("heading", { name: "datagutt" })).toBeHidden();
	expect(errors).toEqual([]);
});

test("journal and legacy pages render", async ({ page }) => {
	const errors = collectPageErrors(page);
	for (const path of ["/journal", "/legacy"]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBeLessThan(400);
		await expect(page.locator("main")).toBeVisible();
	}
	expect(errors).toEqual([]);
});

test("link previews, canonical links and the sitemap are in place", async ({ page, request }) => {
	for (const [path, title] of [
		["/", "datagutt · Fjord Town"],
		["/journal", "Journal · datagutt"],
	] as const) {
		await page.goto(path);
		await expect(page).toHaveTitle(title);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://datagutt.no${path === "/" ? "" : path}`);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://datagutt.no/game/og.png");
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
	}
	const sitemap = await (await request.get("/sitemap.xml")).text();
	expect(sitemap).toContain("<loc>https://datagutt.no/</loc>");
	expect(sitemap).toContain("<loc>https://datagutt.no/journal</loc>");
	expect((await request.get("/game/og.png")).status()).toBe(200);
});
