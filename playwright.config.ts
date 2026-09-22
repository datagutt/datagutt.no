import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	retries: process.env.CI ? 1 : 0,
	use: { baseURL, trace: "retain-on-failure" },
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "phone", use: { ...devices["Pixel 7"] } },
	],
	// Runs against a production build (`pnpm build` first): the canary dev server's
	// Turbopack panics intermittently on this repo. Point E2E_BASE_URL at a preview
	// deployment to skip the local server entirely.
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: `pnpm exec next start --port ${port}`,
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 180_000,
			},
});
