import { beforeAll, describe, expect, it } from "vitest";
import { Compiler, CompilerOptions } from "inkjs/full";
import fs from "node:fs";
import path from "node:path";
import { EMPTY_WORLD_STATE } from "../../content/live";
import { profile } from "../../content/profile";
import { projects } from "../../content/projects";
import { externalDeclarations } from "./externals";
import { NPCS } from "../npcs";
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
		let options = choicesOf(read(first).last);
		expect(options).toContain("What are you working on?");
		expect(options.at(-1)).toBe("See you around.");
		first.choose(options.indexOf("What are you working on?"));
		options = choicesOf(read(first).last);
		// Back at the topics: the asked question is gone, the rest remain.
		expect(options).not.toContain("What are you working on?");
		expect(options).toContain("What do you mostly use?");
		first.choose(options.indexOf("See you around."));
		expect(read(first).last.type).toBe("end");

		const second = new DialogueRunner(json, ctx, first.saveState());
		second.start("datagutt");
		const again = read(second);
		expect(again.lines[0]).not.toContain(profile.about[0]);
		options = choicesOf(again.last);
		expect(options).not.toContain("What are you working on?");
		second.choose(options.indexOf("What do you mostly use?"));
		expect(read(second).lines).toContain(profile.about[1]);
	});

	it("tags lines that offer a link", () => {
		const runner = new DialogueRunner(json, ctx);
		runner.start("datagutt");
		const options = choicesOf(read(runner).last);
		runner.choose(options.indexOf("Where can I find you online?"));
		const beat = runner.next();
		expect(beat.type === "line" && beat.tags).toContain("link: social github");
	});

	it("greets returning visitors briefly", () => {
		const first = new DialogueRunner(json, ctx);
		first.start("ferryman");
		expect(read(first).lines[0]).toMatch(/Welcome ashore/);
		const second = new DialogueRunner(json, ctx, first.saveState());
		second.start("ferryman");
		expect(read(second).lines[0]).not.toMatch(/Welcome ashore/);
	});

	const sampleWorld = {
		...EMPTY_WORLD_STATE,
		repos: [
			{ author: "datagutt", name: "one", description: "First.", language: "Rust", languageColor: "", stars: 3, forks: 0 },
			{ author: "datagutt", name: "two", description: "Second.", language: "", languageColor: "", stars: 0, forks: 0 },
		],
		stats: { public_repos: 90, followers: 12, total_stars: 300, years_coding: 16 },
		contributions: [{ date: "2026-09-01", count: 5, level: 2 as const }],
	};

	it.each(NPCS.flatMap((n) => [{ id: n.id, world: "live" }, { id: n.id, world: "empty" }]))(
		"$id: every question can be asked and the conversation ends ($world data)",
		({ id, world }) => {
			const runner = new DialogueRunner(json, { ...ctx, world: world === "live" ? sampleWorld : EMPTY_WORLD_STATE });
			runner.start(id);
			const said: string[] = [];
			const asked = new Set<string>();
			for (let steps = 0; steps < 200; steps++) {
				const beat = runner.next();
				if (beat.type === "end") {
					expect(said.join(" ")).not.toMatch(/undefined|NaN|\[object/);
					return;
				}
				if (beat.type === "line") {
					said.push(beat.text);
					continue;
				}
				// Ask every question once, then leave: "Back" out of sub-menus, then goodbye (last).
				const fresh = beat.choices.findIndex((c, i) => !asked.has(c) && !/^Back/.test(c) && i < beat.choices.length - 1);
				const back = beat.choices.findIndex((c) => /^Back/.test(c));
				const pick = fresh >= 0 ? fresh : back >= 0 ? back : beat.choices.length - 1;
				asked.add(beat.choices[pick]);
				runner.choose(pick);
			}
			throw new Error(`${id} did not finish in 200 steps`);
		},
	);

	it("reads the featured shelf from live data, and copes without it", () => {
		const repo = { author: "datagutt", name: "fjord", description: "A town.", language: "TypeScript", languageColor: "#3178c6", stars: 3, forks: 0 };
		const live = new DialogueRunner(json, { ...ctx, world: { ...EMPTY_WORLD_STATE, repos: [repo, { ...repo, name: "boat", language: "" }] } });
		live.start("featured_shelf");
		const { lines, last } = read(live);
		expect(lines[0]).toContain("2 books");
		expect(lines[1]).toBe('* "fjord", bound in TypeScript. A town.');
		expect(lines[2]).toBe('* "boat". A town.');
		expect(last.type).toBe("end");

		const empty = new DialogueRunner(json, ctx);
		empty.start("featured_shelf");
		expect(read(empty).lines[0]).toContain("bare today");
	});
});
