import { beforeAll, describe, expect, it } from "vitest";
import { Compiler, CompilerOptions } from "inkjs/full";
import fs from "node:fs";
import path from "node:path";
import { EMPTY_WORLD_STATE } from "../../content/live";
import { profile } from "../../content/profile";
import { projects } from "../../content/projects";
import { externalDeclarations } from "./externals";
import { DialogueRunner, type Beat } from "./DialogueRunner";

const dir = path.join(__dirname, "ink");
let json = "";

beforeAll(() => {
	const fileHandler = {
		ResolveInkFilename: (name: string) => name,
		LoadInkFileContents: (name: string) =>
			name === "__externals.ink" ? externalDeclarations() : fs.readFileSync(path.join(dir, name), "utf8"),
	};
	const main = `INCLUDE __externals.ink\n${fs.readFileSync(path.join(dir, "main.ink"), "utf8")}`;
	json = new Compiler(main, new CompilerOptions("main.ink", [], false, null, fileHandler)).Compile().ToJson()!;
});

const ctx = { world: EMPTY_WORLD_STATE, hasStamp: () => false, lanyardActivity: () => "offline" };

function lines(runner: DialogueRunner): { lines: string[]; last: Beat } {
	const out: string[] = [];
	for (;;) {
		const beat = runner.next();
		if (beat.type !== "line") return { lines: out, last: beat };
		out.push(beat.text);
	}
}

describe("DialogueRunner", () => {
	it("fills facts in from content", () => {
		const runner = new DialogueRunner(json, ctx);
		runner.start("datagutt");
		const { lines: said, last } = lines(runner);
		expect(said[0]).toContain(profile.firstName);
		expect(said[1]).toBe(profile.about[0]);
		expect(last.type).toBe("choices");
		runner.choose(0);
		const after = lines(runner);
		expect(after.lines.join(" ")).toContain(projects.find((p) => p.id === "portfolio")!.description!);
		expect(after.last.type).toBe("end");
	});

	it("remembers visits across a saved state", () => {
		const first = new DialogueRunner(json, ctx);
		first.start("ferryman");
		const opening = lines(first).lines[0];
		expect(opening).toMatch(/Welcome ashore/);
		first.choose(1);
		lines(first);

		const second = new DialogueRunner(json, ctx, first.saveState());
		second.start("ferryman");
		expect(lines(second).lines[0]).not.toMatch(/Welcome ashore/);
	});
});
