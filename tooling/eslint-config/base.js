import tseslint from "typescript-eslint";

/** Generated or licensed output that no workspace lints. */
export const ignores = {
	ignores: [
		"**/node_modules/**",
		"**/.next/**",
		"**/.turbo/**",
		"**/.kai/**",
		"**/.assets-cache/**",
		"**/public/game/**",
		"**/game/generated/**",
		"**/next-env.d.ts",
	],
};

/** For packages and scripts outside Next: parses TypeScript, no framework rules. */
export default [ignores, { files: ["**/*.{ts,mts,tsx}"], languageOptions: { parser: tseslint.parser } }];
