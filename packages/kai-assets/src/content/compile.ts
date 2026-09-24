// `kai content`: reads a game's content/ folder, checks every file against its
// collection's schema and writes the bundle the game and the site import
// (.kai/content.json), plus JSON Schemas for editors (.kai/schema/<name>.json).
import fs from "node:fs";
import path from "node:path";
import { z, type Collection, type Collections } from "@datagutt/kai/schema";
import { parse as parseYaml } from "yaml";

export const BUNDLE_DIR = ".kai";

/** Every problem found, one per line, so a broken build names all of them at once. */
export class ContentError extends Error {
	constructor(readonly problems: string[]) {
		super(problems.join("\n"));
	}
}

const issueLines = (where: string, error: z.ZodError) =>
	error.issues.map((issue) => `${where} › ${issue.path.join(".") || "(root)"}: ${issue.message}`);

/** "10-portfolio.md" is the entry "portfolio": the number only orders the files. */
export const entryId = (file: string) => path.basename(file, ".md").replace(/^\d+-/, "");

/** Splits a Markdown file into its YAML frontmatter and the text below it. */
export function splitFrontmatter(text: string): { fields: unknown; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
	if (!match) return { fields: {}, body: text.trim() };
	return { fields: parseYaml(match[1]) ?? {}, body: match[2].trim() };
}

function readJsonCollection(dir: string, name: string, problems: string[]): unknown {
	const file = path.join(dir, `${name}.json`);
	if (!fs.existsSync(file)) return undefined;
	try {
		const raw = JSON.parse(fs.readFileSync(file, "utf8"));
		if (raw && typeof raw === "object" && !Array.isArray(raw)) delete raw.$schema;
		return raw;
	} catch (err) {
		problems.push(`content/${name}.json: ${err instanceof Error ? err.message : err}`);
		return undefined;
	}
}

function compileCollection(dir: string, name: string, collection: Collection, problems: string[]): unknown {
	if (collection.kind === "json") {
		const result = collection.schema.safeParse(readJsonCollection(dir, name, problems));
		if (!result.success) problems.push(...issueLines(`content/${name}.json`, result.error));
		return result.data;
	}
	const folder = path.join(dir, name);
	const files = fs.existsSync(folder) ? fs.readdirSync(folder).filter((f) => f.endsWith(".md")).sort() : [];
	const entries: unknown[] = [];
	const seen = new Set<string>();
	for (const file of files) {
		const where = `content/${name}/${file}`;
		const id = entryId(file);
		if (seen.has(id)) problems.push(`${where}: another file is already the entry "${id}"`);
		seen.add(id);
		let parsed: { fields: unknown; body: string };
		try {
			parsed = splitFrontmatter(fs.readFileSync(path.join(folder, file), "utf8"));
		} catch (err) {
			problems.push(`${where}: ${err instanceof Error ? err.message : err}`);
			continue;
		}
		const result = collection.schema.safeParse({ ...(parsed.fields as object), id, [collection.body]: parsed.body });
		if (result.success) entries.push(result.data);
		else problems.push(...issueLines(where, result.error));
	}
	return entries;
}

/** Validates every collection in `<appDir>/content`. Throws a ContentError listing every problem. */
export function compileContent(appDir: string, collections: Collections): Record<string, unknown> {
	const dir = path.join(appDir, "content");
	const problems: string[] = [];
	const content: Record<string, unknown> = {};
	for (const [name, collection] of Object.entries(collections)) content[name] = compileCollection(dir, name, collection, problems);
	if (problems.length) throw new ContentError(problems);
	return content;
}

/** JSON Schema for each JSON collection, so `"$schema": "../.kai/schema/<name>.json"` gives editors autocomplete. */
export function jsonSchemas(collections: Collections): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [name, collection] of Object.entries(collections)) {
		if (collection.kind !== "json") continue;
		const schema = z.toJSONSchema(collection.schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
		if (schema.type === "object") schema.properties = { $schema: { type: "string" }, ...(schema.properties as object) };
		out[name] = schema;
	}
	return out;
}

/** Writes the bundle and the editor schemas under `<appDir>/.kai/`. */
export function writeContent(appDir: string, collections: Collections, content: Record<string, unknown>): void {
	const out = path.join(appDir, BUNDLE_DIR);
	fs.mkdirSync(path.join(out, "schema"), { recursive: true });
	fs.writeFileSync(path.join(out, "content.json"), JSON.stringify(content, null, "\t") + "\n");
	for (const [name, schema] of Object.entries(jsonSchemas(collections))) {
		fs.writeFileSync(path.join(out, "schema", `${name}.json`), JSON.stringify(schema, null, "\t") + "\n");
	}
}
