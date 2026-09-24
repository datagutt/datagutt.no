#!/usr/bin/env node
// Makes the licensed source art available to the asset pipeline and records where it
// came from in .assets-cache/source.json. See docs/game/DESIGN.md §9. kai.json's
// `assets` names the repository, and in order this uses:
//
//   ASSETS_DIR=<path>        this checkout of the art repository (must exist)
//   assets.localPath         a local checkout, relative to the monorepo root, when present
//   $<assets.tokenEnv>       a token to shallow-clone the repository (Vercel builds)
//   otherwise                placeholder mode (coloured rectangles), never in production
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadKaiConfig } from "@datagutt/kai/schema";
import { findRepoRoot, resolveAssetSource } from "./source.mjs";

const cwd = process.cwd();
const { assets } = loadKaiConfig(cwd);
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
		throw new Error(`git ${args[0]} failed for ${assets.repo}:\n${stderr.trim()}`);
	}
}

function cloneOrUpdate(dir, token) {
	const url = `https://github.com/${assets.repo}.git`;
	if (fs.existsSync(path.join(dir, ".git"))) {
		git(["-C", dir, "fetch", "--depth", "1", "origin", assets.branch], token);
		git(["-C", dir, "reset", "--hard", "FETCH_HEAD"], token);
	} else {
		fs.mkdirSync(path.dirname(dir), { recursive: true });
		git(["clone", "--depth", "1", "--branch", assets.branch, url, dir], token);
	}
	if (!isAssetsDir(dir)) {
		throw new Error(`Cloned ${assets.repo}, but ${dir} has no limezu/ folder or LICENSES.md.`);
	}
}

try {
	const source = resolveAssetSource({ env: process.env, cwd, repoRoot: findRepoRoot(cwd), assets, isAssetsDir });
	if (source.mode === "clone") cloneOrUpdate(source.dir, process.env[assets.tokenEnv]);

	fs.mkdirSync(cacheDir, { recursive: true });
	fs.writeFileSync(path.join(cacheDir, "source.json"), JSON.stringify(source, null, "\t") + "\n");

	if (source.mode === "placeholder") {
		console.warn(
			"[assets] No licensed art found: building in PLACEHOLDER mode (coloured rectangles).\n" +
				`[assets] Check out ${assets.repo} at ${assets.localPath} (from the repository root), set ASSETS_DIR, ` +
				`or set ${assets.tokenEnv}.`,
		);
	} else {
		console.log(`[assets] Using licensed art (${source.mode}) from ${source.dir}`);
	}
} catch (err) {
	console.error(`[assets] ${err.message}`);
	process.exit(1);
}
