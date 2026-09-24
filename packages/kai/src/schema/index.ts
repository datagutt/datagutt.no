import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { kaiConfigSchema, type KaiConfig } from "./config.ts";

export { z };
export { kaiConfigSchema, type KaiConfig };
export type { KaiConfigInput } from "./config.ts";
export * from "./content.ts";
export { ENGINE_COLLECTIONS } from "./engine.ts";

/** Validation failures as one line per problem: "kai.json › assets.repo: use "owner/name"". */
export function describeIssues(file: string, error: z.ZodError): string {
	return error.issues.map((issue) => `${file} › ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}

/** Reads and validates `<appDir>/kai.json`. Throws with every problem listed. */
export function loadKaiConfig(appDir: string): KaiConfig {
	const file = path.join(appDir, "kai.json");
	let raw: unknown;
	try {
		raw = JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (err) {
		throw new Error(`Cannot read ${file}: ${err instanceof Error ? err.message : err}`);
	}
	const result = kaiConfigSchema.safeParse(raw);
	if (!result.success) throw new Error(describeIssues("kai.json", result.error));
	return result.data;
}
