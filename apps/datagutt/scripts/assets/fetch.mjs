#!/usr/bin/env node
// Makes the licensed LimeZu source art available to the asset pipeline and records
// where it came from in .assets-cache/source.json. See docs/game/DESIGN.md §9.
//
//   ASSETS_DIR=<path>        use this checkout of datagutt-assets (must exist)
//   ../datagutt-assets       next to the repository, used automatically when present
//   ASSETS_REPO_TOKEN=<tok>  shallow-clone the private repo (Vercel builds)
//   otherwise                placeholder mode (coloured rectangles), never in production
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ASSETS_REPO, findRepoRoot, resolveAssetSource } from "./source.mjs";

const cwd = process.cwd();
const cacheDir = path.join(cwd, ".assets-cache");

const isAssetsDir = (dir) =>
	fs.existsSync(path.join(dir, "limezu")) && fs.existsSync(path.join(dir, "LICENSES.md"));

function git(args, token) {
	// Pass the token as a one-off header so it never lands in .git/config or in logs.
	const auth = Buffer.from(`x-access-token:${token}`).toString("base64");
	try {
		execFileSync(
			"git",
			["-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${auth}`, ...args],
			{ stdio: ["ignore", "ignore", "pipe"] },
		);
	} catch (err) {
		const stderr = String(err.stderr ?? "").replaceAll(token, "***").replaceAll(auth, "***");
		throw new Error(`git ${args[0]} failed for ${ASSETS_REPO}:\n${stderr.trim()}`);
	}
}

function cloneOrUpdate(dir, token) {
	const url = `https://github.com/${ASSETS_REPO}.git`;
	if (fs.existsSync(path.join(dir, ".git"))) {
		git(["-C", dir, "fetch", "--depth", "1", "origin", "main"], token);
		git(["-C", dir, "reset", "--hard", "FETCH_HEAD"], token);
	} else {
		fs.mkdirSync(path.dirname(dir), { recursive: true });
		git(["clone", "--depth", "1", "--branch", "main", url, dir], token);
	}
	if (!isAssetsDir(dir)) {
		throw new Error(`Cloned ${ASSETS_REPO}, but ${dir} has no limezu/ folder or LICENSES.md.`);
	}
}

try {
	const source = resolveAssetSource({ env: process.env, cwd, repoRoot: findRepoRoot(cwd), isAssetsDir });
	if (source.mode === "clone") cloneOrUpdate(source.dir, process.env.ASSETS_REPO_TOKEN);

	fs.mkdirSync(cacheDir, { recursive: true });
	fs.writeFileSync(path.join(cacheDir, "source.json"), JSON.stringify(source, null, "\t") + "\n");

	if (source.mode === "placeholder") {
		console.warn(
			"[assets] No licensed art found: building in PLACEHOLDER mode (coloured rectangles).\n" +
				"[assets] Clone the private assets repo next to this repository (../datagutt-assets), set ASSETS_DIR, " +
				"or set ASSETS_REPO_TOKEN.",
		);
	} else {
		console.log(`[assets] Using licensed art (${source.mode}) from ${source.dir}`);
	}
} catch (err) {
	console.error(`[assets] ${err.message}`);
	process.exit(1);
}
