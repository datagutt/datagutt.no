import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const moving = (page: Page) => page.evaluate(() => (window as unknown as { __kai?: { tile: { x: number } } }).__kai?.tile.x ?? null);

test.describe("game shell accessibility", () => {
	test.skip(({ isMobile }) => isMobile, "keyboard walkthrough");

	test("the Journal is the first stop for keyboard and screen reader users", async ({ page }) => {
		await page.goto("/");
		await page.keyboard.press("Tab");
		const journal = page.getByRole("link", { name: /journal: read it as a normal website/i });
		await expect(journal).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/\/journal$/);
	});

	test("the title screen passes axe and plays by keyboard alone, without trapping focus", async ({ page }) => {
		await page.goto("/?debug&presence=coding");
		await page.evaluate(() => localStorage.clear());
		await page.goto("/?debug&presence=coding");
		expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

		await page.keyboard.press("Enter");
		const newGame = page.getByRole("button", { name: /new game/i });
		await expect(newGame).toBeEnabled({ timeout: 30_000 });
		await expect(newGame).toBeFocused();
		expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
		await page.keyboard.press("ArrowDown");
		await expect(page.getByRole("button", { name: /credits/i })).toBeFocused();
		await page.keyboard.press("ArrowUp");
		await page.keyboard.press("Enter");

		// In the world, on the ferry: skip the crossing and Arne's welcome, then walk.
		await expect.poll(() => moving(page), { timeout: 30_000 }).not.toBeNull();
		const talking = () => page.evaluate(() => (window as unknown as { __kai?: { dialogueOpen: boolean; intro: boolean } }).__kai);
		for (let i = 0; i < 30; i++) {
			const s = await talking();
			if (i > 2 && s && !s.dialogueOpen && !s.intro) break;
			await page.keyboard.press("e");
			await page.waitForTimeout(250);
		}
		const before = await moving(page);
		await page.keyboard.down("ArrowRight");
		await page.waitForTimeout(600);
		await page.keyboard.up("ArrowRight");
		await expect.poll(() => moving(page)).not.toBe(before);

		// Tab leaves the game for the Journal link; nothing hidden on the title takes focus.
		await page.keyboard.press("Tab");
		await expect(page.getByRole("link", { name: /journal/i })).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/\/journal$/);
	});
});
