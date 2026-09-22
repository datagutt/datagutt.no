#!/usr/bin/env node
// Standalone dev harness for game/: esbuild watch + serve, no Next.js involved.
// Open http://localhost:3200/game/dev.html  (add ?debug for the debug overlay).
// Files are written under public/game/ (gitignored) so built assets are served too.
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "public/game/dev");
const port = Number(process.env.PORT ?? 3200);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
	path.join(root, "public/game/dev.html"),
	`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Fjord Town (dev harness)</title>
<style>
	html, body { margin: 0; height: 100%; background: #0b1320; overflow: hidden; }
	#game { position: fixed; inset: 0; overflow: hidden; }
</style>
</head>
<body>
<div id="game"></div>
<script type="module" src="./dev/harness.js"></script>
<script>new EventSource("/esbuild").addEventListener("change", () => location.reload());</script>
</body>
</html>
`,
);

const ctx = await esbuild.context({
	entryPoints: { harness: "game/dev/harness.ts" },
	bundle: true,
	format: "esm",
	outdir: outDir,
	sourcemap: true,
	target: "es2022",
	define: { "process.env.NODE_ENV": '"development"' },
	logLevel: "info",
});

await ctx.watch();
const { port: actualPort } = await ctx.serve({ servedir: path.join(root, "public"), port });
console.log(`[game-dev] http://localhost:${actualPort}/game/dev.html`);
