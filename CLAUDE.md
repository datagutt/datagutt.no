# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fjord Town

The site is a top-down pixel-art game, "Fjord Town", with a plain-text twin, the Journal. Before working on the game, read `apps/datagutt/docs/README.md` (workflow), `apps/datagutt/docs/HANDOFF.md` (where the last session stopped) and `apps/datagutt/docs/PLAN.md` (tasks). Decisions in `apps/datagutt/docs/DESIGN.md` are settled.

The engine is being split out as **kai** (`packages/`), with the site as `apps/datagutt`. On the `kai` branch, read `docs/kai/HANDOFF.md`, `docs/kai/PLAN.md` and `docs/kai/DESIGN.md` instead.

## Project Overview

Personal portfolio site for datagutt, built with **Next.js 16.3**, **React 19.3**, **TypeScript** and **Phaser 4**. A Bun workspace driven by **Turborepo**: the site lives in `apps/datagutt`, and every path below is relative to it. Bun installs and runs scripts; Next itself runs on Node.

## Commands

```bash
# From the repository root (Turborepo runs the task in every workspace)
bun install          # Install dependencies
bun run dev          # Asset build, then the dev server (Turbopack)
bun run build        # Asset build, then the production build
bun run lint         # ESLint
bun run typecheck    # tsc --noEmit
bun run test         # Vitest unit tests (*.test.ts / *.test.mjs)
bun run world:check  # Fail if the generated maps are out of date or invalid
bun run test:e2e     # Build, then Playwright (Chrome desktop and phone) against `next start`
bun run format       # Format with Prettier

# From apps/datagutt (the `kai` CLI from @datagutt/kai-assets, configured by kai.json)
bun run content      # kai content: check content/ against its schemas, write the .kai/ bundle
bun run game:dev     # kai dev: standalone game harness at http://localhost:3200/game/dev.html?debug (run content and assets first)
bun run assets       # kai assets: fetch licensed art (or fall back to placeholders) and build public/game/, then the title strip
bun run world:gen    # kai world gen: generate the maps (world/maps/*.tmj) from world/gen/maps
bun run world:render # kai world render: render the maps to world/out/*.png (--collision, --grid, --objects, --only=<map>)
bun run start        # Start the production server
bun run test:e2e:all # The e2e tests plus Firefox, Safari and iPhone, two workers (WebKit needs `sudo bunx playwright install-deps webkit`)
```

## Architecture

### Pages

- `/` (`app/page.tsx`): the title screen, server-rendered (`components/game/TitleArt.tsx`, an SVG sky over a waterfront built from the game's tiles), and `components/game/GameShell.tsx`, which loads the game (`game/boot.ts`) behind it and runs the Press start menu. `?at=<place>` deep links skip the title.
- `/journal`: every piece of content as a plain, server-rendered page (`components/journal/`), readable with JavaScript off. `/legacy` redirects here.
- `app/not-found.tsx`: the title backdrop with the ways back.
- Metadata, the link-preview image (`/game/og.png`, drawn by `scripts/assets/og.mjs`), `app/sitemap.ts` and `app/robots.ts` share `lib/site.ts`.

### Game (`game/`)

Phaser 4 scenes (`game/scenes/`), entities, input, UI, effects (`game/fx/`), audio (`game/audio/`), saves (`game/save/`), passport progress and live systems. Dialogue is Ink (`game/dialogue/ink/`), compiled by the asset build.

### World (`world/`)

Maps are generated, not drawn: `world/gen/maps/*.ts` build each map with `@datagutt/kai-worldgen` (the art-agnostic toolkit) from LimeZu sheet references (`@datagutt/kai-limezu`; the town's own buildings are in `world/gen/prefabs.ts`), and `bun run world:gen` writes `world/maps/*.tmj`. `kai.json` configures the art source, UI sheets, font and live settings. Pixels never enter this repository; the art lives in the private `datagutt/datagutt-assets` repo, fetched by `bun run assets` (locally from `../datagutt-assets` next to the repository, in CI with `ASSETS_REPO_TOKEN`). Without it the build uses placeholder art.

### Data Fetching (lib/github.ts)

Three server-side functions, cached with `'use cache'`: an hour on success, minutes after a failure (a failure is logged as `[github] … failed`). `lib/world-state.ts` combines them into the game's live payload, embedded in `/` as `<script id="world-state">`, and the Journal renders the same data. Types live in `@datagutt/kai-live`; `content/live.ts` holds the site's defaults (its Discord user, Oslo as the fallback place):

- `getPinnedRepos()` — Scrapes GitHub profile HTML for pinned repos
- `getGitHubStats()` — GitHub REST API for user stats + total stars
- `getContributions()` — External API for contribution calendar data

GitHub username is hardcoded as `datagutt`.

### Styling

Tailwind CSS. Fonts: Geist Sans and Geist Pixel Square (`font-pixel`). The title's logo and blink styles are in `app/globals.css`; the rest is Tailwind classes.

### Content

All copy lives in `content/`: `profile.ts`, `socials.ts`, `projects.ts` (slug ids), `experience.ts`, `skills.ts`, `places.ts` (the game's content map), `credits.ts` and `live.ts` (live data types). The game and the Journal both read from it.

### Live systems (game)

- **Lanyard:** `@datagutt/kai-live` has a plain WebSocket client for `wss://api.lanyard.rest/socket`. Thomas's presence drives the live datagutt NPC (`game/live/datagutt.ts`, `game/entities/LiveThomas.ts`). The Discord id comes from `NEXT_PUBLIC_DISCORD_ID` or `profile.discordId` (`lib/lanyard.ts`) and reaches the game through the WorldState payload. Lanyard only tracks members of its Discord server (`discord.gg/lanyard`).
- **Other visitors:** a WebSocket at `/api/world/ws` with one room per map (`@datagutt/kai-net`: `rooms.ts`, protocol in `protocol.ts`). Visitors see each other as tinted ghosts and send emotes. Fan-out is single-instance: two visitors on different Fluid instances don't see each other (upgrade path: Redis pub/sub or a Durable Object per room). The route uses `experimental_upgradeWebSocket` from `@vercel/functions` (needs the `ws` package) and calls `connection()` before upgrading, because `cacheComponents` is on. `next dev` and `next start` can't upgrade; `bun run game:dev` serves the same rooms locally (`@datagutt/kai-net/node`).
- **Weather:** `@datagutt/kai-live` reads the visitor's current weather from MET Norway and `lib/weather.ts` caches it (Locationforecast; their terms require the identifying User-Agent), placed by Vercel's `x-vercel-ip-city`/`-latitude`/`-longitude` headers and falling back to Oslo. It is cached per place (coordinates to one decimal). `components/game/WorldStateScript.tsx` reads the headers, so it renders per request inside the page's Suspense boundary while the title stays prerendered; the GitHub part (`lib/world-state.ts`) keeps its own hourly cache. `game/world/weather.ts` turns it into the sky and the ambience; `game/fx/Weather.ts` draws it. `?debug&weather=<kind>` overrides it.
- **Kill switch:** `localStorage.setItem("rx_off", "1")` turns other visitors off entirely; the in-game Settings has "Other visitors: On/Off" too.

#### Environment

- `NEXT_PUBLIC_DISCORD_ID` (optional). Discord snowflake for Lanyard. Defaults to the constant in `lib/lanyard.ts`.
- `ASSETS_REPO_TOKEN` (build). Read-only token for `datagutt/datagutt-assets`, so builds use the licensed art. Without it they use placeholders.

## Key Configuration

- **React Compiler** enabled (`babel-plugin-react-compiler`)
- **Turbopack filesystem cache** is disabled when the repo sits on a WSL-mounted Windows drive (`/mnt/...`), where fsync fails
- **Inline CSS** enabled via Next.js experimental config
- **Path alias**: `@/*` maps to project root
- **TypeScript strict mode** enabled

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
