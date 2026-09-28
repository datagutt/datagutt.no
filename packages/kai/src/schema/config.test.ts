import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadKaiConfig } from "./index.ts";

function appWith(config: unknown) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kai-config-"));
	fs.writeFileSync(path.join(dir, "kai.json"), JSON.stringify(config));
	return dir;
}

const valid = {
	id: "demo",
	title: "Demo",
	timezone: "Europe/Oslo",
	startPlace: "dock",
	basePath: "/game/",
	saveKey: "demo.save",
	visitorsOffKey: "demo_visitors_off",
	paths: { maps: "world/maps.ts", ink: "dialogue", dialogueHost: "dialogue/host.ts" },
	assets: { repo: "someone/art", localPath: "../art", tokenEnv: "ART_TOKEN", adapter: "@datagutt/kai-limezu/adapter" },
	ui: { frame: { file: "ui.png", x: 0, y: 0, width: 8, height: 8 }, emotes: "emotes.png" },
	font: { module: "geist/font/pixel", file: "f.woff2", unitsPerPixel: 76 },
};

describe("loadKaiConfig", () => {
	it("fills in the defaults", () => {
		const config = loadKaiConfig(appWith(valid));
		expect(config.assets.branch).toBe("main");
		expect(config.sprites).toEqual({});
		expect(config.live).toEqual({});
	});

	it("names every problem with its path", () => {
		const broken = { ...valid, id: "Demo Game", timezone: "Norway/Fjord", assets: { ...valid.assets, repo: "art" } };
		expect(() => loadKaiConfig(appWith(broken))).toThrow(/kai\.json › id: .*\n.*timezone: not an IANA time zone\n.*kai\.json › assets\.repo: use "owner\/name"/s);
	});
});
