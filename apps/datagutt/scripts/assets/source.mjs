// Decides where the licensed LimeZu source art comes from. Kept free of side effects
// so it can be unit tested; scripts/assets/fetch.mjs does the actual work.
import fs from "node:fs";
import path from "node:path";

export const ASSETS_REPO = "datagutt/datagutt-assets";
/** Relative to the repository root: the assets checkout sits next to this repository. */
export const DEFAULT_LOCAL_DIR = "../datagutt-assets";
export const CLONE_DIR = ".assets-cache/datagutt-assets";

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
 * @param {(dir: string) => boolean} opts.isAssetsDir True when `dir` looks like a
 *   checkout of the assets repo.
 * @returns {AssetSource}
 */
export function resolveAssetSource({ env, cwd, repoRoot, isAssetsDir }) {
	if (env.ASSETS_DIR) {
		const dir = path.resolve(cwd, env.ASSETS_DIR);
		if (!isAssetsDir(dir)) {
			throw new Error(
				`ASSETS_DIR is set to ${dir}, but that is not a checkout of ${ASSETS_REPO} ` +
					"(no limezu/ folder or LICENSES.md). Fix the path or unset ASSETS_DIR.",
			);
		}
		return { mode: "local", dir };
	}

	const sibling = path.resolve(repoRoot, DEFAULT_LOCAL_DIR);
	if (isAssetsDir(sibling)) return { mode: "local", dir: sibling };

	if (env.ASSETS_REPO_TOKEN) {
		return { mode: "clone", dir: path.resolve(cwd, CLONE_DIR) };
	}

	// Shipping coloured rectangles to production would be a silent disaster.
	if (env.VERCEL_ENV === "production") {
		throw new Error(
			"No licensed art available for a production build. Set ASSETS_REPO_TOKEN in the " +
				`Vercel project to a read-only token for ${ASSETS_REPO}.`,
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
