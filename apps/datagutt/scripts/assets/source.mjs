// Decides where the licensed source art comes from: kai.json's `assets` names the
// repository, its usual local checkout and the token variable. resolveAssetSource() is
// free of side effects so it can be unit tested; scripts/assets/fetch.mjs does the work.
import fs from "node:fs";
import path from "node:path";
import { loadKaiConfig } from "@datagutt/kai/schema";

/** Where a clone of `repo` goes, relative to the app. */
export const cloneDir = (repo) => `.assets-cache/${repo.split("/")[1]}`;

/**
 * @typedef {{ mode: "local", dir: string }
 *   | { mode: "clone", dir: string }
 *   | { mode: "placeholder", dir: null }} AssetSource
 */

/**
 * @param {object} opts
 * @param {Record<string, string | undefined>} opts.env
 * @param {string} opts.cwd The app's directory.
 * @param {string} opts.repoRoot The repository root.
 * @param {{ repo: string, localPath: string, tokenEnv: string }} opts.assets kai.json's `assets`.
 * @param {(dir: string) => boolean} opts.isAssetsDir True when `dir` looks like a
 *   checkout of the assets repo.
 * @returns {AssetSource}
 */
export function resolveAssetSource({ env, cwd, repoRoot, assets, isAssetsDir }) {
	if (env.ASSETS_DIR) {
		const dir = path.resolve(cwd, env.ASSETS_DIR);
		if (!isAssetsDir(dir)) {
			throw new Error(
				`ASSETS_DIR is set to ${dir}, but that is not a checkout of ${assets.repo} ` +
					"(no limezu/ folder or LICENSES.md). Fix the path or unset ASSETS_DIR.",
			);
		}
		return { mode: "local", dir };
	}

	const local = path.resolve(repoRoot, assets.localPath);
	if (isAssetsDir(local)) return { mode: "local", dir: local };

	if (env[assets.tokenEnv]) {
		return { mode: "clone", dir: path.resolve(cwd, cloneDir(assets.repo)) };
	}

	// Shipping coloured rectangles to production would be a silent disaster.
	if (env.VERCEL_ENV === "production") {
		throw new Error(
			`No licensed art available for a production build. Set ${assets.tokenEnv} in the ` +
				`Vercel project to a read-only token for ${assets.repo}.`,
		);
	}
	return { mode: "placeholder", dir: null };
}

/** The monorepo root: the nearest directory above `from` that holds turbo.json. */
export function findRepoRoot(from, exists = fs.existsSync) {
	for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
		if (exists(path.join(dir, "turbo.json"))) return dir;
		if (path.dirname(dir) === dir) throw new Error(`No turbo.json above ${from}.`);
	}
}

/**
 * The local art checkout for the tools that need real art (catalog, snow drafts, the
 * character review), or null. They never clone.
 */
export function localArtDir(cwd) {
	const { assets } = loadKaiConfig(cwd);
	const source = resolveAssetSource({
		env: { ...process.env, [assets.tokenEnv]: undefined },
		cwd,
		repoRoot: findRepoRoot(cwd),
		assets,
		isAssetsDir: (dir) => fs.existsSync(path.join(dir, "limezu")),
	});
	return source.dir;
}
