import { expect, test, type Page } from "@playwright/test";

type FjordState = {
	map: string;
	tile: { x: number; y: number };
	facing: string;
	moving: boolean;
	dialogueOpen: boolean;
	blips: number;
	audio: string;
	choices: string[] | null;
	selected: number | null;
	stamps: string[];
	passportOpen: boolean;
	menu: string;
	thomas: { place: string; tile: { x: number; y: number } | null; asleep: boolean };
};

const state = (page: Page) => page.evaluate(() => (window as unknown as { __fjord?: FjordState }).__fjord ?? null);

async function holdKey(page: Page, key: string, ms: number) {
	await page.keyboard.down(key);
	await page.waitForTimeout(ms);
	await page.keyboard.up(key);
}

/**
 * Start from a save at the given spot, through the title screen's Continue button.
 * `presence` fixes Thomas's Discord presence (game/live/datagutt.ts MOCK_PRESENCES), so
 * where he stands doesn't depend on the real Lanyard feed.
 */
async function continueAt(page: Page, at: { map: string; x: number; y: number; facing: string }, presence = "coding") {
	await page.goto(`/?debug&presence=${presence}`);
	await page.evaluate(
		(save) => localStorage.setItem("fjordtown.save", JSON.stringify({ version: 1, ...save, stamps: [], flags: {}, dialogue: {}, settings: {} })),
		at,
	);
	await page.goto(`/?debug&presence=${presence}`);
	await page.getByRole("button", { name: /continue/i }).click();
	await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: at.map, tile: { x: at.x, y: at.y } });
}

test.describe("world", () => {
	// Keyboard play only; the phone project covers taps through the title-screen test.
	test.skip(({ isMobile }) => isMobile, "keyboard walkthrough");

	test("deep link skips the title and doors connect both ways", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		await page.goto("/?at=home&debug");
		await expect(page.getByRole("heading", { name: "datagutt" })).toBeHidden();
		await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: "town", tile: { x: 18, y: 40 } });

		// Step up onto the door tile, then straight back out.
		await holdKey(page, "ArrowUp", 300);
		await expect.poll(() => state(page)).toMatchObject({ map: "house", tile: { x: 10, y: 11 }, facing: "up" });
		await expect.poll(async () => (await state(page))?.moving).toBe(false);
		await holdKey(page, "ArrowDown", 300);
		await expect.poll(() => state(page), { timeout: 5_000 }).toMatchObject({ map: "town", tile: { x: 18, y: 40 } });
		expect(errors).toEqual([]);
	});

	test("talking to datagutt stamps the passport", async ({ page }) => {
		await continueAt(page, { map: "house-up", x: 7, y: 5, facing: "left" });
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(true);

		// Read through the Ink conversation until it closes: ask the questions in order,
		// then say goodbye (the first choice becomes "ask again" once all are asked).
		for (let i = 0; i < 40 && (await state(page))?.dialogueOpen; i++) {
			const s = await state(page);
			if (s?.choices?.[0] === "Can I ask you something again?") {
				for (let k = s.selected ?? 0; k < s.choices.length - 1; k++) {
					await page.keyboard.press("ArrowDown");
					await page.waitForTimeout(60);
				}
			}
			await page.keyboard.press("e");
			await page.waitForTimeout(250);
		}
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(false);
		// Talking makes blips once audio is unlocked (the key presses count as a gesture).
		const afterTalk = await state(page);
		if (afterTalk?.audio === "running") expect(afterTalk.blips).toBeGreaterThan(0);
		// Finishing datagutt's conversation stamps the passport; the START menu shows it.
		expect(afterTalk?.stamps).toContain("home");
		await page.keyboard.press("Enter");
		await expect.poll(async () => (await state(page))?.menu).toBe("main");
		await page.keyboard.press("e"); // Passport is the first item
		await expect.poll(async () => (await state(page))?.passportOpen).toBe(true);
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.menu).toBe("main");
		await page.keyboard.press("Enter");
		await expect.poll(async () => (await state(page))?.menu).toBe("closed");
	});

	test("Thomas follows his presence: asleep in bed, awake to talk, then off out", async ({ page }) => {
		await continueAt(page, { map: "house-up", x: 4, y: 7, facing: "left" }, "offline");
		await expect.poll(async () => (await state(page))?.thomas).toMatchObject({ place: "bed", asleep: true, tile: { x: 3, y: 7 } });

		// Talking to him asleep offers to wake him.
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(true);
		for (let i = 0; i < 5 && !(await state(page))?.choices; i++) {
			await page.keyboard.press("e");
			await page.waitForTimeout(250);
		}
		expect((await state(page))?.choices).toEqual(["Wake him up.", "Let him sleep."]);
		await page.keyboard.press("ArrowDown");
		await page.waitForTimeout(60);
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(false);
		// Letting him sleep isn't a conversation: no stamp.
		expect((await state(page))?.stamps).not.toContain("home");

		// He comes online with music on: out of bed and off down the stairs to the fjord.
		await page.evaluate(() => (window as unknown as { __fjordPresence(name: string): void }).__fjordPresence("music"));
		await expect.poll(async () => (await state(page))?.thomas.asleep).toBe(false);
		await expect.poll(async () => (await state(page))?.thomas.tile, { timeout: 15_000 }).toBeNull();

		// The START menu says where he went.
		await page.keyboard.press("Enter");
		await expect.poll(async () => (await state(page))?.menu).toBe("main");
		await page.keyboard.press("ArrowDown");
		await page.waitForTimeout(60);
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.menu).toBe("status");
	});

	test("reloading continues where the player left off", async ({ page }) => {
		await page.goto("/?at=office&debug");
		await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: "town", tile: { x: 71, y: 37 } });
		// Down the office path.
		await holdKey(page, "ArrowDown", 300);
		await expect.poll(async () => (await state(page))?.moving).toBe(false);
		const moved = await state(page);
		expect(moved?.tile).not.toEqual({ x: 71, y: 37 });

		await page.goto("/?debug");
		await expect(page.getByRole("button", { name: /continue/i })).toBeEnabled({ timeout: 30_000 });
		await page.getByRole("button", { name: /continue/i }).click();
		await expect.poll(() => state(page)).toMatchObject({ map: "town", tile: moved!.tile });
	});

	test("a link offered in dialogue opens in a new tab", async ({ page, context }) => {
		// Stand next to datagutt, facing him.
		await continueAt(page, { map: "house-up", x: 7, y: 5, facing: "left" });

		await page.keyboard.press("e");
		// Read until the topics appear, then pick "Where can I find you online?".
		const pick = async (label: string) => {
			for (let i = 0; i < 20; i++) {
				const s = await state(page);
				if (s?.choices?.includes(label)) break;
				await page.keyboard.press("e");
				await page.waitForTimeout(200);
			}
			const s = await state(page);
			const target = s!.choices!.indexOf(label);
			// One press per frame or so: Phaser folds same-key presses within a frame.
			for (let i = s!.selected!; i < target; i++) {
				await page.keyboard.press("ArrowDown");
				await page.waitForTimeout(60);
			}
			await expect.poll(async () => (await state(page))?.selected).toBe(target);
		};
		await pick("Where can I find you online?");
		await page.keyboard.press("e");
		await pick("Open GitHub (github.com)");

		const popup = context.waitForEvent("page");
		await page.keyboard.press("e");
		expect((await popup).url()).toContain("github.com/datagutt");
	});
});

