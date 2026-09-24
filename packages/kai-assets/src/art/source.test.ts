import path from "node:path";
import { describe, expect, it } from "vitest";
import { cloneDir, findRepoRoot, resolveAssetSource as resolve } from "./source.ts";

const repoRoot = "/work/datagutt";
const cwd = `${repoRoot}/apps/datagutt`;
const assets = { repo: "datagutt/datagutt-assets", localPath: "../datagutt-assets", tokenEnv: "ASSETS_REPO_TOKEN" };
const sibling = path.resolve(repoRoot, assets.localPath);
const resolveAssetSource = (opts: Omit<Parameters<typeof resolve>[0], "assets">) => resolve({ assets, ...opts });
const onlyExists =
	(...dirs: string[]) =>
	(dir: string) =>
		dirs.includes(dir);

describe("resolveAssetSource", () => {
	it("uses ASSETS_DIR when it points at an assets checkout", () => {
		const source = resolveAssetSource({
			env: { ASSETS_DIR: "/art/assets", ASSETS_REPO_TOKEN: "t" },
			cwd,
			repoRoot,
			isAssetsDir: onlyExists("/art/assets", sibling),
		});
		expect(source).toEqual({ mode: "local", dir: "/art/assets" });
	});

	it("fails loudly when ASSETS_DIR is wrong instead of falling back", () => {
		expect(() =>
			resolveAssetSource({ env: { ASSETS_DIR: "/nope" }, cwd, repoRoot, isAssetsDir: onlyExists(sibling) }),
		).toThrow(/ASSETS_DIR/);
	});

	it("prefers the sibling checkout over cloning", () => {
		const source = resolveAssetSource({
			env: { ASSETS_REPO_TOKEN: "t" },
			cwd,
			repoRoot,
			isAssetsDir: onlyExists(sibling),
		});
		expect(source).toEqual({ mode: "local", dir: sibling });
	});

	it("clones when only a token is available", () => {
		const source = resolveAssetSource({ env: { ASSETS_REPO_TOKEN: "t" }, cwd, repoRoot, isAssetsDir: onlyExists() });
		expect(source).toEqual({ mode: "clone", dir: path.resolve(cwd, cloneDir(assets.repo)) });
	});

	it("falls back to placeholders outside production", () => {
		const source = resolveAssetSource({ env: { VERCEL_ENV: "preview" }, cwd, repoRoot, isAssetsDir: onlyExists() });
		expect(source).toEqual({ mode: "placeholder", dir: null });
	});

	it("refuses placeholder art in a production build", () => {
		expect(() =>
			resolveAssetSource({ env: { VERCEL_ENV: "production" }, cwd, repoRoot, isAssetsDir: onlyExists() }),
		).toThrow(/ASSETS_REPO_TOKEN/);
	});
});

describe("findRepoRoot", () => {
	it("walks up to the workspace root, past an app's own package.json", () => {
		const packages: Record<string, string> = {
			"/work/datagutt/apps/sandbox/package.json": JSON.stringify({ name: "sandbox" }),
			"/work/datagutt/package.json": JSON.stringify({ workspaces: ["apps/*"] }),
		};
		expect(findRepoRoot("/work/datagutt/apps/sandbox", (file) => packages[file] ?? null)).toBe("/work/datagutt");
	});
});
