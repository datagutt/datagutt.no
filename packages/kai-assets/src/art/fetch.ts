// Makes the licensed source art available to the asset build and records where it came
// from in .assets-cache/source.json. kai.json's `assets` names the repository, and in
// order this uses:
//
//   ASSETS_DIR=<path>        this checkout of the art repository (must exist)
//   assets.localPath         a local checkout, relative to the monorepo root, when present
//   $<assets.tokenEnv>       a token to shallow-clone the repository (Vercel builds)
//   otherwise                placeholder mode (coloured rectangles), never in production
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { KaiApp } from "../app.ts";
import { findRepoRoot, resolveAssetSource, type AssetSource } from "./source.ts";

export const sourceFile = (app: KaiApp) => path.join(app.dir, ".assets-cache/source.json");

export async function fetchArt(app: KaiApp): Promise<AssetSource> {
	const { assets } = app.config;
	const adapter = await app.adapter();
	// A clone must also carry the licences, which ship with the art.
	const isAssetsDir = (dir: string) => adapter.isArtDir(dir) && fs.existsSync(path.join(dir, "LICENSES.md"));

	function git(args: string[], token: string) {
		// Pass the token as a one-off header so it never lands in .git/config or in logs.
		const auth = Buffer.from(`x-access-token:${token}`).toString("base64");
		try {
			execFileSync("git", ["-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${auth}`, ...args], {
				stdio: ["ignore", "ignore", "pipe"],
			});
		} catch (err) {
			const stderr = String((err as { stderr?: unknown }).stderr ?? "")
				.replaceAll(token, "***")
				.replaceAll(auth, "***");
			throw new Error(`git ${args[0]} failed for ${assets.repo}:\n${stderr.trim()}`);
		}
	}

	function cloneOrUpdate(dir: string, token: string) {
		const url = `https://github.com/${assets.repo}.git`;
		if (fs.existsSync(path.join(dir, ".git"))) {
			git(["-C", dir, "fetch", "--depth", "1", "origin", assets.branch], token);
			git(["-C", dir, "reset", "--hard", "FETCH_HEAD"], token);
		} else {
			fs.mkdirSync(path.dirname(dir), { recursive: true });
			git(["clone", "--depth", "1", "--branch", assets.branch, url, dir], token);
		}
		if (!isAssetsDir(dir)) throw new Error(`Cloned ${assets.repo}, but ${dir} has no art or LICENSES.md.`);
	}

	const source = resolveAssetSource({ env: process.env, cwd: app.dir, repoRoot: findRepoRoot(app.dir), assets, isAssetsDir });
	if (source.mode === "clone") cloneOrUpdate(source.dir, process.env[assets.tokenEnv]!);

	fs.mkdirSync(path.dirname(sourceFile(app)), { recursive: true });
	fs.writeFileSync(sourceFile(app), JSON.stringify(source, null, "\t") + "\n");

	if (source.mode === "placeholder") {
		console.warn(
			"[assets] No licensed art found: building in PLACEHOLDER mode (coloured rectangles).\n" +
				`[assets] Check out ${assets.repo} at ${assets.localPath} (from the repository root), set ASSETS_DIR, ` +
				`or set ${assets.tokenEnv}.`,
		);
	} else {
		console.log(`[assets] Using licensed art (${source.mode}) from ${source.dir}`);
	}
	return source;
}
