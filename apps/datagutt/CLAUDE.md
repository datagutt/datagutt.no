# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `apps/datagutt`. Paths below are relative to this folder. The monorepo, the engine and its rules are in the root `CLAUDE.md`.

## What this is

datagutt.no: Thomas Lekanger's portfolio as a top-down pixel-art game, "Fjord Town", built on the kai engine, with a plain-text twin, the Journal. Next.js 16.3, React 19.3, Phaser 4. The game's docs are in `docs/`: read `docs/README.md` (workflow) first. Decisions in `docs/DESIGN.md` are settled; `docs/ART.md` covers working with the LimeZu art.

## Commands

```bash
bun run dev           # next dev (run from the root, or run content and assets first)
bun run build         # next build
bun run start         # next start
bun run content       # kai content: check content/ and kai.json, write .kai/
bun run assets        # kai assets, then the title strip and link preview (scripts/title.ts)
bun run game:dev      # kai dev: the game alone at http://localhost:3200/game/dev.html?debug, with the world socket
bun run world:gen     # kai world gen: world/gen/maps/*.ts to world/maps/*.tmj
bun run world:render  # kai world render: world/out/*.png (--collision, --grid, --objects, --only=<map>)
bun run world:catalog # kai art catalog: rebuild the LimeZu sheet catalogue
bun run characters:review  # kai characters: a contact sheet of every character
bun run test:e2e      # Playwright (Chrome desktop and phone) against `next start`, or E2E_BASE_URL
bun run test:e2e:all  # Plus Firefox, Safari and iPhone, two workers (WebKit needs `sudo bunx playwright install-deps webkit`)
```

## Layout

- `kai.json`: the game's configuration (save key `fjordtown.save`, `rx_off`, Europe/Oslo, the art source, UI sheets, font, live settings).
- `content/`: every piece of copy, as JSON (`profile`, `places`, `npcs`, `presence`, ...) and Markdown (`projects/`, `experience/`), checked by `content/schema.ts` plus the engine's schemas. The `.ts` files beside them are typed accessors. The game and the Journal both read it.
- `game/`: Fjord Town on the engine. `game/index.ts` (`startFjordTown`) calls `createGame` with the config, content, live data, dialogue functions and plugins. Plugins are in `game/plugins/` (the cat, arcade cabinets, the ferry intro, the finale, the Journal menu item); the presence NPC and GitHub objects come from `@datagutt/kai-live`. Ink is in `game/dialogue/ink/`, its external functions in `game/dialogue/externals.ts`. `game/` must not import Next or React.
- `world/gen/`: the map builders (`maps/*.ts`), the town's own prefabs and map text (`content/mapText.json`). The generated `world/maps/*.tmj` and the tile registry are committed.
- `app/`, `components/`, `lib/`: the Next site.
- `scripts/`: the title strip and link preview image, and art tools.
- `docs/`: the game's design, plan, handoff and art notes.

## Pages

- `/` (`app/page.tsx`): the title screen, server-rendered (`components/game/TitleArt.tsx`, an SVG sky over a waterfront drawn from the game's tiles), and `components/game/GameShell.tsx`, which loads the game behind it through `@datagutt/kai-next`'s `useKaiGame` and runs the Press start menu. `?at=<place>` deep links skip the title.
- `/journal`: every piece of content as a plain, server-rendered page (`components/journal/`), readable with JavaScript off. `/legacy` redirects here.
- `app/not-found.tsx`: the title backdrop with the ways back.
- Metadata, the link preview image (`/game/og.png`, drawn by `scripts/og.mjs`), `app/sitemap.ts` and `app/robots.ts` share `lib/site.ts`.

## Live data

- **GitHub:** `lib/world-state.ts` fetches pinned repos, stats and the contribution calendar through `@datagutt/kai-next/github` (`'use cache'`: hours when everything arrived, minutes after a failure). It is embedded in `/` as `<script id="world-state">`, and the Journal renders the same data. The user comes from `kai.json` (`live.github.user`).
- **Weather:** `lib/weather.ts` reads the visitor's weather from MET Norway (their terms require the User-Agent in `kai.json`), placed by Vercel's `x-vercel-ip-city`/`-latitude`/`-longitude` headers and falling back to Oslo, cached per place. `components/game/WorldStateScript.tsx` reads the headers, so it renders per request inside the page's Suspense boundary while the title stays prerendered. `?debug&weather=<kind>` overrides it.
- **Lanyard:** Thomas's Discord presence drives the live NPC (`presenceNpc` from `@datagutt/kai-live`, configured by `content/presence.json`). The Discord id comes from `NEXT_PUBLIC_DISCORD_ID` or the constant in `lib/lanyard.ts`. Lanyard only tracks members of its Discord server (`discord.gg/lanyard`).
- **Other visitors:** `app/api/world/ws/route.ts` serves the ghost rooms (`@datagutt/kai-next`'s `worldSocketHandler`, one room per map). Fan-out is single instance: visitors on different Fluid instances don't see each other (upgrade path: Redis pub/sub or a Durable Object per room). `next dev` and `next start` can't upgrade the socket; `bun run game:dev` serves the rooms locally. `localStorage.setItem("rx_off", "1")` or the in-game setting turns other visitors off.

## Environment

- `NEXT_PUBLIC_DISCORD_ID` (optional): the Discord snowflake for Lanyard.
- `ASSETS_REPO_TOKEN` (build): a read-only token for `datagutt/datagutt-assets`, so builds use the licensed art. Without it they use placeholders.

## Key configuration

- React Compiler (`babel-plugin-react-compiler`), inline CSS, TypeScript strict.
- `transpilePackages` lists the `@datagutt/kai*` dependencies, which ship as TypeScript source.
- The Turbopack filesystem cache is off when the repository sits on a WSL-mounted Windows drive (`/mnt/...`), where fsync fails.
- Path alias: `@/*` maps to this folder.
- Tailwind CSS. Fonts: Geist Sans and Geist Pixel Square (`font-pixel`). The title's logo and blink styles are in `app/globals.css`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
