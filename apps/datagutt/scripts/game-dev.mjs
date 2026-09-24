#!/usr/bin/env node
// Standalone dev harness for game/: esbuild watch + serve, no Next.js involved.
// Open http://localhost:3200/game/dev.html  (add ?debug for the debug overlay).
// Files are written under public/game/ (gitignored) so built assets are served too.
// A small server in front of esbuild's also answers the world socket, so ghosts work
// between two tabs (@datagutt/kai-net/node).
import * as esbuild from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { attachWorldSocket } from "@datagutt/kai-net/node";

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
// esbuild serves on a private port; everything but the socket is passed through to it.
const inner = await ctx.serve({ servedir: path.join(root, "public"), host: "127.0.0.1", port: port + 1000 });
const server = http.createServer((req, res) => {
	const upstream = http.request({ host: "127.0.0.1", port: inner.port, path: req.url, method: req.method, headers: req.headers }, (up) => {
		res.writeHead(up.statusCode ?? 502, up.headers);
		up.pipe(res);
	});
	upstream.on("error", () => res.writeHead(502).end());
	req.pipe(upstream);
});
attachWorldSocket(server);
server.listen(port, () => console.log(`[game-dev] http://localhost:${port}/game/dev.html`));
