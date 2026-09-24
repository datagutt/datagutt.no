// Compiles a game's Ink dialogue (main.ink and its INCLUDEs) to JSON and checks it against
// the game's registry of external functions: an unknown id in a call such as
// project_desc("irlsever") fails the build instead of failing in front of a visitor.
import fs from "node:fs";
import path from "node:path";
import { Compiler, CompilerOptions } from "inkjs/full";

/** One external function dialogue can call, and the kind of its first argument. */
export type ExternalSpec = { params: readonly string[]; arg: string; doc: string };

/** What the build needs to know about a game's dialogue functions and link tags. */
export type DialogueHost = {
	externals: Readonly<Record<string, ExternalSpec>>;
	/** Ink source declaring every external, prepended to the story. */
	declarations: () => string;
	/** Valid literal values for an argument kind, or null when not checkable statically. */
	validIds: (arg: string) => readonly string[] | null;
	/** A tag checked as a link: an error, a link, or null when the tag is no link. */
	resolveLink: (tag: string) => { error: string } | object | null;
};

const EXTERNALS_FILE = "__externals.ink";

/** Literal first-argument checks on the raw source, with file and line for the error. */
export function validateSource(host: DialogueHost, file: string, source: string): string[] {
	const problems: string[] = [];
	const names = Object.keys(host.externals).join("|");
	const call = new RegExp(`\\b(${names})\\s*\\(\\s*(?:"([^"]*)"|(-?\\d+))?`, "g");
	source.split("\n").forEach((line, i) => {
		if (/^\s*\/\//.test(line)) return;
		for (const tag of line.split("#").slice(1)) {
			const link = host.resolveLink(tag);
			if (link && "error" in link) problems.push(`${file}:${i + 1}: ${link.error}`);
		}
		for (const m of line.matchAll(call)) {
			const [, name, str] = m;
			const spec = host.externals[name];
			if (str === undefined) continue; // variable or number argument: checked at runtime
			const ids = host.validIds(spec.arg);
			if (ids && !ids.includes(str)) {
				problems.push(`${file}:${i + 1}: ${name}("${str}"): unknown ${spec.arg}. Valid: ${ids.join(", ")}`);
			}
		}
	});
	return problems;
}

export type CompiledDialogue = { json: string; files: string[]; knots: string[] };

/** Compiles `<dir>/main.ink`. Throws with every problem listed. */
export function compileDialogue(dir: string, host: DialogueHost): CompiledDialogue {
	const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ink"));
	const problems = files.flatMap((f) => validateSource(host, f, fs.readFileSync(path.join(dir, f), "utf8")));

	const errors: string[] = [];
	const fileHandler = {
		ResolveInkFilename: (name: string) => name,
		LoadInkFileContents: (name: string) => (name === EXTERNALS_FILE ? host.declarations() : fs.readFileSync(path.join(dir, name), "utf8")),
	};
	const errorHandler = (message: string, type: number) => {
		// type 2 is an error, 1 a warning, 0 author TODOs.
		if (type === 2) errors.push(message);
		else if (type === 1) console.warn(`[ink] ${message}`);
	};
	const main = `INCLUDE ${EXTERNALS_FILE}\n${fs.readFileSync(path.join(dir, "main.ink"), "utf8")}`;
	const compiler = new Compiler(main, new CompilerOptions("main.ink", [], false, errorHandler, fileHandler));
	let story = null;
	try {
		story = compiler.Compile();
	} catch (err) {
		errors.push(String((err as Error)?.message ?? err));
	}

	const all = [...problems, ...errors];
	if (all.length || !story) {
		throw new Error(`Dialogue has ${all.length} problem(s):\n  ${all.join("\n  ")}`);
	}
	const json = story.ToJson() ?? "";
	const root = JSON.parse(json).root;
	const knots = Object.keys(root[root.length - 1] ?? {}).filter((k) => !k.startsWith("#"));
	return { json, files, knots };
}
