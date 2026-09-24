import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: { "@": path.resolve(import.meta.dirname) },
	},
	test: {
		include: ["**/*.test.{ts,mts,mjs}"],
		exclude: ["node_modules/**", ".next/**", "e2e/**", ".assets-cache/**"],
	},
});
