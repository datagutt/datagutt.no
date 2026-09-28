import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Placeholder builds (CI has no art token) draw no link-preview image, see
// scripts/assets/build.mjs. A remote E2E_BASE_URL is a real deployment with the art.
function builtWithPlaceholders() {
	if (process.env.E2E_BASE_URL) return false;
	try {
		return JSON.parse(fs.readFileSync(".assets-cache/source.json", "utf8")).mode === "placeholder";
	} catch {
		return true;
	}
}

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
	await expect(page.getByRole("link", { name: "Read it as a normal website", exact: true })).toBeVisible();

	const start = page.getByRole("button", { name: /new game/i });
	await expect(start).toBeEnabled({ timeout: 30_000 });
	await expect(page.locator("canvas")).toHaveCount(1);

	await start.click();
	await expect(page.getByRole("heading", { name: "datagutt" })).toBeHidden();
	expect(errors).toEqual([]);
});

test("the old /legacy address leads to the Journal, and unknown ones to a way back", async ({ page }) => {
	const errors = collectPageErrors(page);
	await page.goto("/legacy");
	await expect(page).toHaveURL(/\/journal$/);
	await expect(page.getByRole("heading", { name: "datagutt's Journal" })).toBeVisible();

	const response = await page.goto("/no-such-place");
	expect(response?.status()).toBe(404);
	await expect(page.getByRole("link", { name: "Back to town" })).toBeVisible();
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
	expect((await request.get("/game/og.png")).status()).toBe(builtWithPlaceholders() ? 404 : 200);
});
