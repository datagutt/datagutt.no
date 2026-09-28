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
		// The QA matrix (docs/PLAN.md M6.6): `bun run test:e2e:all`. Off by default, since
		// WebKit needs system libraries (`sudo bunx playwright install-deps webkit`).
		...(process.env.E2E_ALL_BROWSERS
			? [
					// Firefox's bounce-tracking protection purges the saves the tests plant in
					// localStorage between navigations; players never hit it.
					{ name: "firefox", use: { ...devices["Desktop Firefox"], launchOptions: { firefoxUserPrefs: { "privacy.bounceTrackingProtection.mode": 0 } } } },
					{ name: "safari", use: { ...devices["Desktop Safari"] } },
					{ name: "iphone", use: { ...devices["iPhone 15"] } },
				]
			: []),
	],
	// Runs against a production build (`bun run build` first): the canary dev server's
	// Turbopack panics intermittently on this repo. Point E2E_BASE_URL at a preview
	// deployment to skip the local server entirely.
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: `bunx next start --port ${port}`,
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 180_000,
			},
});
