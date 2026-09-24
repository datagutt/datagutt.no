import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLONE_DIR, DEFAULT_LOCAL_DIR, findRepoRoot, resolveAssetSource } from "./source.mjs";

const repoRoot = "/work/datagutt";
const cwd = `${repoRoot}/apps/datagutt`;
const sibling = path.resolve(repoRoot, DEFAULT_LOCAL_DIR);
const onlyExists = (...dirs) => (dir) => dirs.includes(dir);

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
		expect(source).toEqual({ mode: "clone", dir: path.resolve(cwd, CLONE_DIR) });
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
	it("walks up to the directory with turbo.json", () => {
		const exists = (file) => file === "/work/datagutt/turbo.json";
		expect(findRepoRoot("/work/datagutt/apps/datagutt", exists)).toBe("/work/datagutt");
	});
});
