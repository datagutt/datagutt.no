import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { json, markdown, z } from "@datagutt/kai/schema";
import { describe, expect, it } from "vitest";
import { compileContent, ContentError, jsonSchemas, splitFrontmatter } from "./compile.ts";

function app(files: Record<string, string>) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kai-content-"));
	for (const [name, text] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(dir, "content", name)), { recursive: true });
		fs.writeFileSync(path.join(dir, "content", name), text);
	}
	return dir;
}

const collections = {
	profile: json(z.object({ name: z.string(), since: z.int() })),
	links: json(z.object({ links: z.array(z.object({ label: z.string(), url: z.url() })) }).default({ links: [] })),
	projects: markdown(z.object({ id: z.string(), name: z.string(), description: z.string() }), { body: "description" }),
};

describe("compileContent", () => {
	it("reads JSON and Markdown collections, in file name order", () => {
		const dir = app({
			"profile.json": JSON.stringify({ $schema: "../.kai/schema/profile.json", name: "Ada", since: 1843 }),
			"projects/20-engine.md": "---\nname: Analytical Engine\n---\n\nA general computer.\n",
			"projects/10-notes.md": "---\nname: Notes\n---\nOn Bernoulli numbers.",
		});
		expect(compileContent(dir, collections)).toEqual({
			profile: { name: "Ada", since: 1843 },
			links: { links: [] },
			projects: [
				{ id: "notes", name: "Notes", description: "On Bernoulli numbers." },
				{ id: "engine", name: "Analytical Engine", description: "A general computer." },
			],
		});
	});

	it("names every broken file and field", () => {
		const dir = app({
			"profile.json": JSON.stringify({ name: 1, since: 1843 }),
			"links.json": JSON.stringify({ links: [{ label: "x", url: "not a url" }] }),
			"projects/10-notes.md": "---\ntitle: Notes\n---\nText.",
		});
		let problems: string[] = [];
		try {
			compileContent(dir, collections);
		} catch (err) {
			problems = (err as ContentError).problems;
		}
		expect(problems).toEqual([
			expect.stringMatching(/^content\/profile\.json › name: /),
			expect.stringMatching(/^content\/links\.json › links\.0\.url: /),
			expect.stringMatching(/^content\/projects\/10-notes\.md › name: /),
		]);
	});

	it("reports a missing required file and broken JSON", () => {
		expect(() => compileContent(app({}), collections)).toThrow(/content\/profile\.json › \(root\)/);
		expect(() => compileContent(app({ "profile.json": "{ nope" }), collections)).toThrow(/content\/profile\.json: /);
	});
});

describe("splitFrontmatter", () => {
	it("takes the text alone when there is no frontmatter", () => {
		expect(splitFrontmatter("Just text.\n")).toEqual({ fields: {}, body: "Just text." });
	});
});

describe("jsonSchemas", () => {
	it("allows $schema in object files", () => {
		const schema = jsonSchemas(collections).profile as { properties: Record<string, unknown> };
		expect(schema.properties.$schema).toEqual({ type: "string" });
	});
});
