import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3300);

// The sandbox has no site: the smoke test plays it in the kai dev harness.
export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	retries: process.env.CI ? 1 : 0,
	use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
	projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `PORT=${port} bun run dev`,
		url: `http://localhost:${port}/game/dev.html`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
