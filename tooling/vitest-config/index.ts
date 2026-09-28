import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";

/** The shared test setup: unit tests sit next to the code as *.test.ts or *.test.mjs. */
export function kaiVitest(overrides: ViteUserConfig = {}) {
	return mergeConfig(
		defineConfig({
			test: {
				include: ["**/*.test.{ts,mts,mjs}"],
				exclude: ["node_modules/**", ".next/**", "e2e/**", ".assets-cache/**", ".turbo/**"],
			},
		}),
		overrides,
	);
}
