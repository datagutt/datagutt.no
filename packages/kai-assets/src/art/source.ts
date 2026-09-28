// Decides where the licensed source art comes from: kai.json's `assets` names the
// repository, its usual local checkout and the token variable. resolveAssetSource() is
// free of side effects so it can be unit tested; fetch.ts does the work.
import fs from "node:fs";
import path from "node:path";
import type { KaiConfig } from "@datagutt/kai/schema";

export type AssetSource = { mode: "local"; dir: string } | { mode: "clone"; dir: string } | { mode: "placeholder"; dir: null };

type AssetsConfig = Pick<KaiConfig["assets"], "repo" | "localPath" | "tokenEnv">;

/** Where a clone of `repo` goes, relative to the app. */
export const cloneDir = (repo: string) => `.assets-cache/${repo.split("/")[1]}`;

/** The game's hand-drawn seasonal art, relative to the art checkout, under the folder for art of that game alone. */
export const seasonOverridesDir = (config: Pick<KaiConfig, "id">) => `games/${config.id}/seasons`;

export function resolveAssetSource(opts: {
	env: Record<string, string | undefined>;
	/** The app's directory. */
	cwd: string;
	/** The repository root. */
	repoRoot: string;
	assets: AssetsConfig;
	/** True when `dir` looks like a checkout of the assets repo. */
	isAssetsDir: (dir: string) => boolean;
}): AssetSource {
	const { env, cwd, repoRoot, assets, isAssetsDir } = opts;
	if (env.ASSETS_DIR) {
		const dir = path.resolve(cwd, env.ASSETS_DIR);
		if (!isAssetsDir(dir)) {
			throw new Error(
				`ASSETS_DIR is set to ${dir}, but that is not a checkout of ${assets.repo} ` +
					"(no art folder or LICENSES.md). Fix the path or unset ASSETS_DIR.",
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

/**
 * The monorepo root: the nearest directory above `from` whose package.json declares
 * `workspaces`. (Not the nearest turbo.json: an app may have its own.)
 */
export function findRepoRoot(from: string, readPackage: (file: string) => string | null = readIfExists): string {
	for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
		const text = readPackage(path.join(dir, "package.json"));
		if (text && "workspaces" in JSON.parse(text)) return dir;
		if (path.dirname(dir) === dir) throw new Error(`No workspace root (a package.json with "workspaces") above ${from}.`);
	}
}

function readIfExists(file: string): string | null {
	return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

/**
 * The local art checkout for the tools that need real art (catalog, snow drafts, the
 * character review), or null. They never clone.
 */
export function localArtDir(appDir: string, assets: AssetsConfig, isAssetsDir: (dir: string) => boolean): string | null {
	return resolveAssetSource({
		env: { ...process.env, [assets.tokenEnv]: undefined },
		cwd: appDir,
		repoRoot: findRepoRoot(appDir),
		assets,
		isAssetsDir,
	}).dir;
}
