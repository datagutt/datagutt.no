// `kai dev`: a standalone harness for the game, with no host site involved: esbuild watch
// and serve, live reload, and the world socket so ghosts work between two tabs. Open
// http://localhost:3200<basePath>dev.html (add ?debug for the debug overlay). Files are
// written under public/<basePath> (gitignored), so the built assets are served too.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import * as esbuild from "esbuild";
import { attachWorldSocket } from "@datagutt/kai-net/node";
import type { KaiApp } from "../app.ts";

export async function devHarness(app: KaiApp): Promise<void> {
	const { config, outDir } = app;
	if (!config.paths.harness) throw new Error("[dev] kai.json paths.harness names no entry module for the harness.");
	const port = Number(process.env.PORT ?? 3200);
	fs.mkdirSync(path.join(outDir, "dev"), { recursive: true });
	fs.writeFileSync(
		path.join(outDir, "dev.html"),
		`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${config.title} (dev harness)</title>
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
		absWorkingDir: app.dir,
		entryPoints: { harness: config.paths.harness },
		bundle: true,
		format: "esm",
		outdir: path.join(outDir, "dev"),
		sourcemap: true,
		target: "es2022",
		define: { "process.env.NODE_ENV": '"development"' },
		logLevel: "info",
	});

	await ctx.watch();
	// esbuild serves on a private port; everything but the socket is passed through to it.
	const inner = await ctx.serve({ servedir: path.join(app.dir, "public"), host: "127.0.0.1", port: port + 1000 });
	const server = http.createServer((req, res) => {
		const upstream = http.request({ host: "127.0.0.1", port: inner.port, path: req.url, method: req.method, headers: req.headers }, (res2) => {
			res.writeHead(res2.statusCode ?? 502, res2.headers);
			res2.pipe(res);
		});
		upstream.on("error", () => res.writeHead(502).end());
		req.pipe(upstream);
	});
	attachWorldSocket(server);
	server.listen(port, () => console.log(`[dev] http://localhost:${port}${config.basePath}dev.html`));
}
