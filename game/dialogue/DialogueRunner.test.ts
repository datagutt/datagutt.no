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

function read(runner: DialogueRunner): { lines: string[]; last: Beat } {
	const out: string[] = [];
	for (;;) {
		const beat = runner.next();
		if (beat.type !== "line") return { lines: out, last: beat };
		out.push(beat.text);
	}
}

const choicesOf = (beat: Beat) => (beat.type === "choices" ? beat.choices : []);

describe("DialogueRunner", () => {
	it("fills facts in from content", () => {
		const runner = new DialogueRunner(json, ctx);
		runner.start("datagutt");
		const { lines: said, last } = read(runner);
		expect(said[0]).toContain(profile.firstName);
		expect(said[1]).toBe(profile.about[0]);
		runner.choose(choicesOf(last).indexOf("What are you working on?"));
		expect(read(runner).lines.join(" ")).toContain(projects.find((p) => p.id === "portfolio")!.description!);
	});

	it("keeps unasked questions available, within a visit and on the next one", () => {
		const first = new DialogueRunner(json, ctx);
		first.start("datagutt");
		let beat = read(first).last;
		expect(choicesOf(beat)).toHaveLength(3);
		first.choose(0);
		beat = read(first).last;
		// Back at the topics: the asked question is gone, the rest remain.
		expect(choicesOf(beat)).toEqual(["What do you mostly use?", "See you around."]);
		first.choose(1);
		expect(read(first).last.type).toBe("end");

		const second = new DialogueRunner(json, ctx, first.saveState());
		second.start("datagutt");
		const again = read(second);
		expect(again.lines[0]).not.toContain(profile.about[0]);
		expect(choicesOf(again.last)).toEqual(["What do you mostly use?", "See you around."]);
		second.choose(0);
		expect(read(second).lines).toContain(profile.about[1]);
	});

	it("greets returning visitors briefly", () => {
		const first = new DialogueRunner(json, ctx);
		first.start("ferryman");
		expect(read(first).lines[0]).toMatch(/Welcome ashore/);
		const second = new DialogueRunner(json, ctx, first.saveState());
		second.start("ferryman");
		expect(read(second).lines[0]).not.toMatch(/Welcome ashore/);
	});
});
