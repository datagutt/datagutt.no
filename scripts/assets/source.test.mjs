import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLONE_DIR, DEFAULT_LOCAL_DIR, resolveAssetSource } from "./source.mjs";

const cwd = "/work/datagutt";
const sibling = path.resolve(cwd, DEFAULT_LOCAL_DIR);
const onlyExists = (...dirs) => (dir) => dirs.includes(dir);

describe("resolveAssetSource", () => {
	it("uses ASSETS_DIR when it points at an assets checkout", () => {
		const source = resolveAssetSource({
			env: { ASSETS_DIR: "/art/assets", ASSETS_REPO_TOKEN: "t" },
			cwd,
			isAssetsDir: onlyExists("/art/assets", sibling),
		});
		expect(source).toEqual({ mode: "local", dir: "/art/assets" });
	});

	it("fails loudly when ASSETS_DIR is wrong instead of falling back", () => {
		expect(() =>
			resolveAssetSource({ env: { ASSETS_DIR: "/nope" }, cwd, isAssetsDir: onlyExists(sibling) }),
		).toThrow(/ASSETS_DIR/);
	});

	it("prefers the sibling checkout over cloning", () => {
		const source = resolveAssetSource({
			env: { ASSETS_REPO_TOKEN: "t" },
			cwd,
			isAssetsDir: onlyExists(sibling),
		});
		expect(source).toEqual({ mode: "local", dir: sibling });
	});

	it("clones when only a token is available", () => {
		const source = resolveAssetSource({ env: { ASSETS_REPO_TOKEN: "t" }, cwd, isAssetsDir: onlyExists() });
		expect(source).toEqual({ mode: "clone", dir: path.resolve(cwd, CLONE_DIR) });
	});

	it("falls back to placeholders outside production", () => {
		const source = resolveAssetSource({ env: { VERCEL_ENV: "preview" }, cwd, isAssetsDir: onlyExists() });
		expect(source).toEqual({ mode: "placeholder", dir: null });
	});

	it("refuses placeholder art in a production build", () => {
		expect(() =>
			resolveAssetSource({ env: { VERCEL_ENV: "production" }, cwd, isAssetsDir: onlyExists() }),
		).toThrow(/ASSETS_REPO_TOKEN/);
	});
});
