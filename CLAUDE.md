# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Game rebuild in progress (`game` branch)

The site is being rebuilt as a top-down pixel-art game ("Fjord Town"). Before working on it, read `docs/game/README.md` (workflow), `docs/game/HANDOFF.md` (where the last session stopped) and `docs/game/PLAN.md` (tasks). Decisions in `docs/game/DESIGN.md` are settled. On this branch `/` is the game and the old site lives at `/legacy` until M6; the sections below cover both.

## Project Overview

Personal portfolio site for datagutt, built with **Next.js 16.3**, **React 19.3**, and **TypeScript**. Uses **pnpm** as package manager.

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm game:dev     # Standalone game harness at http://localhost:3200/game/dev.html?debug (esbuild, live reload)
pnpm assets       # Fetch licensed art (or fall back to placeholders) and build public/game/
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint CLI (Next.js config; `next lint` no longer exists in Next 16)
pnpm test         # Vitest unit tests (*.test.ts / *.test.mjs)
pnpm test:e2e     # Playwright against `next start` (run `pnpm build` first) or E2E_BASE_URL
pnpm format       # Format with Prettier (includes Tailwind class sorting)
pnpm format:check # Check formatting
```

## Architecture

### Page Structure

Single-page portfolio (`app/page.tsx`) — a server component that fetches GitHub data, then renders sections with `Suspense` boundaries. Below-fold components using GSAP/ScrollTrigger are dynamically imported to reduce initial bundle.

### Canvas System

Five interactive canvas backgrounds rendered in the hero section via `components/canvas/CanvasSwitcher.tsx`:

- **PixelCanvas** — Conway's Game of Life with data pulses, mouse-seeded life, avatar hover burst effect
- **TerrainCanvas** — Simplex noise terrain with mouse-driven elevation, continuous drift via GSAP
- **FallingBlocksCanvas** — Tetris-style falling blocks
- **DungeonCanvas** — Procedural dungeon generation
- **StarfieldCanvas** — Parallax starfield

All canvases use `app/utils/canvas.ts` for DPI-aware setup and `hooks/useResizeKey.ts` for responsive resizing.

### Data Fetching (lib/github.ts)

Three server-side functions, cached with `'use cache'`: an hour on success, minutes after a failure (a failure is logged as `[github] … failed`). `lib/world-state.ts` combines them into the game's live payload, embedded in `/` as `<script id="world-state">`. Types live in `content/live.ts`:

- `getPinnedRepos()` — Scrapes GitHub profile HTML for pinned repos
- `getGitHubStats()` — GitHub REST API for user stats + total stars
- `getContributions()` — External API for contribution calendar data

GitHub username is hardcoded as `datagutt`.

### Animation

GSAP with ScrollTrigger for scroll-based section entrances. All animation code respects `prefers-reduced-motion`. Canvas animations run at 60fps via requestAnimationFrame.

### Styling

Tailwind CSS with dark mode (class strategy). Custom green color palette (`primary-50` through `primary-950`). Custom pixel font families defined in `tailwind.config.ts`. Global styles in `app/globals.css` include glitch effects, pixel dividers, and custom scrollbar.

### Content

All copy lives in `content/`: `profile.ts`, `socials.ts`, `projects.ts` (slug ids), `experience.ts`, `skills.ts`, `places.ts` (the game's content map) and `live.ts` (live data types). The game, the Journal and the legacy components all read from it.

### Live systems (game)

- **Lanyard:** `game/net/lanyard.ts` is a plain WebSocket client for `wss://api.lanyard.rest/socket`. Thomas's presence drives the live datagutt NPC (`game/live/datagutt.ts`, `game/entities/LiveThomas.ts`). The Discord id comes from `NEXT_PUBLIC_DISCORD_ID` or `profile.discordId` (`lib/lanyard.ts`) and reaches the game through the WorldState payload. Lanyard only tracks members of its Discord server (`discord.gg/lanyard`).
- **Other visitors:** a WebSocket at `/api/world/ws` with one room per map (`lib/world/rooms.ts`, protocol in `game/net/protocol.ts`). Visitors see each other as tinted ghosts and send emotes. Fan-out is single-instance: two visitors on different Fluid instances don't see each other (upgrade path: Redis pub/sub or a Durable Object per room). The route uses `experimental_upgradeWebSocket` from `@vercel/functions` (needs the `ws` package) and calls `connection()` before upgrading, because `cacheComponents` is on. `next dev` and `next start` can't upgrade; `pnpm game:dev` serves the same rooms locally (`scripts/world-socket.mjs`).
- **Kill switch:** `localStorage.setItem("rx_off", "1")` turns other visitors off entirely; the in-game Settings has "Other visitors: On/Off" too.

#### Environment

- `NEXT_PUBLIC_DISCORD_ID` (optional). Discord snowflake for Lanyard. Defaults to the constant in `lib/lanyard.ts`.

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
