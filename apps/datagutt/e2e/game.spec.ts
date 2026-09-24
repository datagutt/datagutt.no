import { expect, test, type Page } from "@playwright/test";

type KaiState = {
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
	/** The live datagutt NPC (the presence plugin). */
	liveNpc: { place: string; tile: { x: number; y: number } | null; asleep: boolean };
	emoteWheel: boolean;
	prompt: string | null;
	intro: boolean;
	credits: boolean;
	finale: boolean;
	/** Animated sprites on screen, by name. */
	sprites: string[];
	/** Each critter as `<sprite>@<x>,<y>:<home|moving|aside|away>`. */
	critters: string[];
};

const state = (page: Page) => page.evaluate(() => (window as unknown as { __kai?: KaiState }).__kai ?? null);

/** Past "Press start" to the title menu, then pick an item once loading allows it. */
async function choose(page: Page, item: RegExp) {
	await page.getByRole("button", { name: /press start/i }).click();
	const button = page.getByRole("button", { name: item });
	await expect(button).toBeEnabled({ timeout: 30_000 });
	await button.click();
}

async function holdKey(page: Page, key: string, ms: number) {
	await page.keyboard.down(key);
	await page.waitForTimeout(ms);
	await page.keyboard.up(key);
}

/**
 * Start from a save at the given spot, through the title screen's Continue button.
 * `presence` fixes Thomas's Discord presence (content/presence.json mocks), so
 * where he stands doesn't depend on the real Lanyard feed.
 */
async function continueAt(page: Page, at: { map: string; x: number; y: number; facing: string }, presence = "coding", stamps: string[] = [], query = "") {
	await page.goto(`/?debug&presence=${presence}${query}`);
	await page.evaluate(
		([save, stamps]) => localStorage.setItem("fjordtown.save", JSON.stringify({ version: 1, ...save, stamps, flags: {}, dialogue: {}, settings: {} })),
		[at, stamps] as const,
	);
	await page.goto(`/?debug&presence=${presence}${query}`);
	await choose(page, /continue/i);
	await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: at.map, tile: { x: at.x, y: at.y } });
}

test.describe("world", () => {
	// Keyboard play only; the phone project covers taps through the title-screen test.
	test.skip(({ isMobile }) => isMobile, "keyboard walkthrough");

	test("a save from before the engine split still loads, stamps, achievements and records kept", async ({ page }) => {
		// As the Fjord Town build before kai wrote it: the same key, version 1.
		const save = {
			version: 1,
			updatedAt: "2026-09-20T12:00:00.000Z",
			map: "town",
			x: 18,
			y: 40,
			facing: "down",
			stamps: ["library", "farm"],
			flags: { intro: true, "achievement:cat": true },
			records: { blocks: 420 },
			dialogue: {},
			settings: { muted: false, music: true, showVisitors: true, reducedMotion: null, effects: "auto" },
		};
		await page.goto("/?debug&presence=coding");
		await page.evaluate((s) => localStorage.setItem("fjordtown.save", JSON.stringify(s)), save);
		await page.goto("/?debug&presence=coding");
		await choose(page, /continue/i);
		await expect.poll(() => state(page), { timeout: 30_000 }).toMatchObject({ map: "town", tile: { x: 18, y: 40 }, stamps: ["library", "farm"] });
		// The world writes the save back as it starts: still under the same key, nothing lost.
		const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("fjordtown.save") ?? "{}"));
		expect(stored).toMatchObject({ version: 1, stamps: ["library", "farm"], records: { blocks: 420 }, flags: { intro: true, "achievement:cat": true } });
	});

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
		await expect.poll(async () => (await state(page))?.liveNpc).toMatchObject({ place: "bed", asleep: true, tile: { x: 3, y: 7 } });

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
		await page.evaluate(() => (window as unknown as { __kaiPresence(name: string): void }).__kaiPresence("music"));
		await expect.poll(async () => (await state(page))?.liveNpc.asleep).toBe(false);
		await expect.poll(async () => (await state(page))?.liveNpc.tile, { timeout: 15_000 }).toBeNull();

		// The START menu says where he went.
		await page.keyboard.press("Enter");
		await expect.poll(async () => (await state(page))?.menu).toBe("main");
		await page.keyboard.press("ArrowDown");
		await page.waitForTimeout(60);
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.menu).toBe("status");
	});

	test("prompts say what interact will do, and interact walks through doors", async ({ page }) => {
		await continueAt(page, { map: "house-up", x: 7, y: 5, facing: "left" });
		await expect.poll(async () => (await state(page))?.prompt).toBe("E Talk");
		// Turn away (a short hold turns without stepping): nothing to use there.
		await holdKey(page, "ArrowRight", 60);
		await expect.poll(async () => (await state(page))?.facing).toBe("right");
		await expect.poll(async () => (await state(page))?.prompt).toBeNull();

		await continueAt(page, { map: "town", x: 45, y: 26, facing: "up" });
		await expect.poll(async () => (await state(page))?.prompt).toBe("E Enter");
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.map).toBe("town-hall");
	});

	test("a first visit sails in on the ferry and meets Arne; a return does not", async ({ page }) => {
		await page.goto("/?debug&presence=coding");
		await page.evaluate(() => localStorage.clear());
		await page.goto("/?debug&presence=coding");
		await choose(page, /new game/i);
		await expect.poll(async () => (await state(page))?.intro, { timeout: 30_000 }).toBe(true);
		// Skip the crossing: Arne's welcome comes straight away.
		await page.keyboard.press("e");
		await expect.poll(async () => (await state(page))?.dialogueOpen).toBe(true);
		for (let i = 0; i < 30 && (await state(page))?.dialogueOpen; i++) {
			await page.keyboard.press("e");
			await page.waitForTimeout(250);
		}
		await expect.poll(async () => (await state(page))?.intro).toBe(false);
		expect((await state(page))?.dialogueOpen).toBe(false);

		await page.goto("/?debug&presence=coding");
		await choose(page, /continue/i);
		await expect.poll(async () => (await state(page))?.map, { timeout: 30_000 }).toBe("town");
		expect((await state(page))?.intro).toBe(false);
	});

	test("new game over a save asks first, then starts over on the ferry", async ({ page }) => {
		await page.goto("/?debug&presence=coding");
		await page.evaluate(() =>
			localStorage.setItem(
				"fjordtown.save",
				JSON.stringify({ version: 1, map: "town", x: 45, y: 26, facing: "up", stamps: ["library"], flags: { intro: true }, dialogue: {}, settings: { muted: true } }),
			),
		);
		await page.goto("/?debug&presence=coding");
		await choose(page, /new game/i);
		await expect(page.getByText(/progress will be forgotten/i)).toBeVisible();
		await page.getByRole("button", { name: /keep my save/i }).click();
		await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();

		await page.getByRole("button", { name: /new game/i }).click();
		await page.getByRole("button", { name: /start over/i }).click();
		await expect.poll(async () => (await state(page))?.intro, { timeout: 30_000 }).toBe(true);
		expect((await state(page))?.stamps).toEqual([]);
	});

	test("the last stamp leads to the finale: the pier at night, credits, then contact", async ({ page }) => {
		// Three conversations and the credits: under a full parallel run, slow machines need
		// longer than the default.
		test.setTimeout(240_000);
		// Every stamp but Thomas's, then talk to him at his desk.
		const others = ["boathouse", "radio-tower", "kiosk", "office", "town-hall", "gym", "library", "farm", "post-office"];
		await continueAt(page, { map: "house-up", x: 7, y: 5, facing: "left" }, "coding", others);
		const readUntil = async (done: () => Promise<boolean>) => {
			// A time budget rather than a count of presses: typing speed follows the frame rate.
			const deadline = Date.now() + 70_000;
			while (Date.now() < deadline && !(await done())) {
				const s = await state(page);
				// Say goodbye as soon as it's offered, then read on.
				const bye = s?.choices?.findIndex((c) => /see you|thanks|let him sleep/i.test(c)) ?? -1;
				for (let k = s?.selected ?? 0; bye >= 0 && k < bye; k++) {
					await page.keyboard.press("ArrowDown");
					await page.waitForTimeout(60);
				}
				await page.keyboard.press("e");
				await page.waitForTimeout(200);
			}
			if (!(await done())) throw new Error(`Gave up reading; the game is at ${JSON.stringify(await state(page))}`);
		};
		await page.keyboard.press("e");
		// His conversation, the stamp, then the note in the back of the passport.
		await readUntil(async () => (await state(page))?.finale === true);
		await expect.poll(async () => (await state(page))?.map).toBe("town");
		await expect.poll(async () => (await state(page))?.prompt).toBe("E Talk");

		await page.keyboard.press("e");
		await readUntil(async () => (await state(page))?.credits === true);
		await page.keyboard.press("x"); // skip the credits
		await readUntil(async () => !(await state(page))?.dialogueOpen && !(await state(page))?.credits);
		await expect.poll(async () => (await state(page))?.finale, { message: JSON.stringify(await state(page)) }).toBe(false);
		const flags = await page.evaluate(() => JSON.parse(localStorage.getItem("fjordtown.save") ?? "{}").flags);
		expect(flags.finale).toBe(true);
	});

	test("the town's animations follow the season and the daylight", async ({ page }) => {
		const square = { map: "town", x: 47, y: 38, facing: "down" };
		await continueAt(page, square, "coding", [], "&season=summer&time=day");
		const summerDay = (await state(page))?.sprites ?? [];
		expect(summerDay).toEqual(expect.arrayContaining(["windmill-blades", "fountain", "ferry", "rowboat", "crow-left", "seagull-left", "buoy", "butterfly"]));

		await continueAt(page, square, "coding", [], "&season=winter&time=night");
		const winterNight = (await state(page))?.sprites ?? [];
		expect(winterNight).toEqual(expect.arrayContaining(["windmill-blades", "fountain", "ferry", "buoy"]));
		for (const daytime of ["crow-left", "seagull-left", "butterfly"]) expect(winterNight).not.toContain(daytime);
	});

	test("a crow flies off when the player comes close", async ({ page }) => {
		// Two tiles east of the crow on the square's south side: close enough to scare it.
		await continueAt(page, { map: "town", x: 55, y: 38, facing: "left" }, "coding", [], "&season=summer&time=day");
		await expect.poll(async () => (await state(page))?.critters, { timeout: 10_000 }).toContain("crow-left@53,38:away");
		// Crows further off stay put.
		expect((await state(page))?.critters).toContain("crow-left@51,31:home");
	});

	test("a full passport whose finale never finished brings it back on the next map", async ({ page }) => {
		test.setTimeout(120_000);
		const all = ["home", "boathouse", "radio-tower", "kiosk", "office", "town-hall", "gym", "library", "farm", "post-office"];
		await continueAt(page, { map: "town", x: 18, y: 40, facing: "down" }, "coding", all);
		// Thomas's note, then night falls and the pier is where the game puts the player.
		await expect.poll(async () => (await state(page))?.dialogueOpen, { timeout: 10_000 }).toBe(true);
		const deadline = Date.now() + 60_000;
		while (Date.now() < deadline && !(await state(page))?.finale) {
			await page.keyboard.press("e");
			await page.waitForTimeout(200);
		}
		await expect.poll(async () => (await state(page))?.finale).toBe(true);
		await expect.poll(async () => (await state(page))?.liveNpc?.place).toBe("pier");
	});

	test("holding interact opens the emote wheel; back closes it", async ({ page }) => {
		await continueAt(page, { map: "town", x: 30, y: 44, facing: "down" });
		await page.keyboard.down("e");
		await expect.poll(async () => (await state(page))?.emoteWheel).toBe(true);
		await page.keyboard.up("e");
		await page.keyboard.press("x");
		await expect.poll(async () => (await state(page))?.emoteWheel).toBe(false);
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
		await choose(page, /continue/i);
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

