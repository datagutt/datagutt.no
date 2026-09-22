// Decides where the licensed LimeZu source art comes from. Kept free of side effects
// so it can be unit tested; scripts/assets/fetch.mjs does the actual work.
import path from "node:path";

export const ASSETS_REPO = "datagutt/datagutt-assets";
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
 * @param {string} opts.cwd Project root.
 * @param {(dir: string) => boolean} opts.isAssetsDir True when `dir` looks like a
 *   checkout of the assets repo.
 * @returns {AssetSource}
 */
export function resolveAssetSource({ env, cwd, isAssetsDir }) {
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

	const sibling = path.resolve(cwd, DEFAULT_LOCAL_DIR);
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
