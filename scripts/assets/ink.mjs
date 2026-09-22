// Compiles the Ink dialogue (game/dialogue/ink/main.ink and its INCLUDEs) to JSON and
// validates it against the external registry: an unknown id in a call such as
// project_desc("irlsever") fails the build instead of failing in front of a visitor.
import fs from "node:fs";
import path from "node:path";
import { Compiler, CompilerOptions } from "inkjs/full";
import { EXTERNALS, externalDeclarations, validIds } from "../../game/dialogue/externals.ts";

const EXTERNALS_FILE = "__externals.ink";

/** Literal first-argument checks on the raw source, with file and line for the error. */
export function validateSource(file, source) {
	const problems = [];
	const names = Object.keys(EXTERNALS).join("|");
	const call = new RegExp(`\\b(${names})\\s*\\(\\s*(?:"([^"]*)"|(-?\\d+))?`, "g");
	source.split("\n").forEach((line, i) => {
		if (/^\s*\/\//.test(line)) return;
		for (const m of line.matchAll(call)) {
			const [, name, str] = m;
			const spec = EXTERNALS[name];
			if (str === undefined) continue; // variable or number argument: checked at runtime
			const ids = validIds(spec.arg);
			if (ids && !ids.includes(str)) {
				problems.push(`${file}:${i + 1}: ${name}("${str}"): unknown ${spec.arg}. Valid: ${ids.join(", ")}`);
			}
		}
	});
	return problems;
}

/**
 * @param {string} dir directory holding main.ink
 * @returns {{ json: string, files: string[], knots: string[] }}
 */
export function compileDialogue(dir) {
	const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ink"));
	const problems = files.flatMap((f) => validateSource(f, fs.readFileSync(path.join(dir, f), "utf8")));

	const errors = [];
	const fileHandler = {
		ResolveInkFilename: (name) => name,
		LoadInkFileContents: (name) => (name === EXTERNALS_FILE ? externalDeclarations() : fs.readFileSync(path.join(dir, name), "utf8")),
	};
	const errorHandler = (message, type) => {
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
		errors.push(String(err?.message ?? err));
	}

	const all = [...problems, ...errors];
	if (all.length || !story) {
		throw new Error(`Dialogue has ${all.length} problem(s):\n  ${all.join("\n  ")}`);
	}
	const json = story.ToJson();
	const root = JSON.parse(json).root;
	const knots = Object.keys(root[root.length - 1] ?? {}).filter((k) => !k.startsWith("#"));
	return { json, files, knots };
}
