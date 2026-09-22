# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Game rebuild in progress (`game` branch)

The site is being rebuilt as a top-down pixel-art game ("Fjord Town"). Before working on it, read `docs/game/README.md` (workflow), `docs/game/HANDOFF.md` (where the last session stopped) and `docs/game/PLAN.md` (tasks). Decisions in `docs/game/DESIGN.md` are settled. The sections below describe the current production site on `master`.

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

Three server-side functions, all cached for 1 hour via `unstable_cache` + React `cache()`:

- `getPinnedRepos()` — Scrapes GitHub profile HTML for pinned repos
- `getGitHubStats()` — GitHub REST API for user stats + total stars
- `getContributions()` — External API for contribution calendar data

GitHub username is hardcoded as `datagutt`.

### Animation

GSAP with ScrollTrigger for scroll-based section entrances. All animation code respects `prefers-reduced-motion`. Canvas animations run at 60fps via requestAnimationFrame.

### Styling

Tailwind CSS with dark mode (class strategy). Custom green color palette (`primary-50` through `primary-950`). Custom pixel font families defined in `tailwind.config.ts`. Global styles in `app/globals.css` include glitch effects, pixel dividers, and custom scrollbar.

### Data Files

Static data lives in `data/` — `projects.ts`, `experience.ts`, `skills.ts`. Each exports typed arrays used by their respective components.

### Lanyard live status (components/LanyardCard.tsx)

Live Discord/Spotify presence card in the hero, right side. Uses `react-use-lanyard` (client WebSocket to `wss://api.lanyard.rest/socket`).

- Discord ID resolves from `NEXT_PUBLIC_DISCORD_ID` (override) or the hardcoded `DEFAULT_DISCORD_ID` constant in `lib/lanyard.ts`. The card works out of the box, no env var required.
- Requires the Discord user to be a member of the Lanyard guild (`discord.gg/lanyard`). If not joined, the card silently renders nothing.
- Card is absolutely positioned to avoid layout shift on data arrival, fades in with GSAP. Hidden on mobile (`<md`) since the absolute slot would clip the content column.

### Reactions overlay (components/reactions/, lib/reactions/, app/api/reactions/)

Canvas-agnostic ephemeral multiplayer reaction layer. Visitors drop a chunky pixel ripple on click; click-and-hold (220ms) opens a radial palette of 8-bit pixel sprites (heart, star, fire, skull, sparkle).

- Transport: a single bidirectional WebSocket at `/api/reactions/ws` (Node runtime, Fluid Compute, `maxDuration: 300`, 30s server ping). The client sends its reaction over the same socket it receives others on. Built on `experimental_upgradeWebSocket` from `@vercel/functions` (needs the `ws` package). Because `cacheComponents` is enabled, the route handler calls `connection()` before upgrading so it opts out of static prerendering. Local dev needs `vc dev` (Vercel CLI), since `next dev` does not run the WebSocket upgrade.
- Coordinates normalize to the nearest top-level `<section id>` (hero/portfolio/about/techstack/experience/opensource/stats/contact). Receivers re-project per RAF against their own section rect, so scroll/resize tracks naturally.
- The server skips echoing an event back to the connection that sent it (the sender already renders its own drop optimistically), so there is no client side sid filtering. Clients reconnect with exponential backoff on close, and buffer a small outbox of unsent reactions while the socket is down.
- Single-instance fan-out only. A WebSocket connection is pinned to one Fluid instance, and one instance can host many connections, but two clients pinned to different instances under load will not see each other. Acceptable for ephemeral vibes; upgrade path is Upstash Redis pub/sub if needed.
- Rate limit: in-process token bucket per WebSocket connection (5 tokens, 1/sec refill). The bucket lives and dies with the connection, so no shared map or GC is needed.
- Click capture is window-level (`pointerdown` capture phase). Canvas mousemove and other handlers are not affected. Interactive targets and any element with `[data-no-reactions]` are skipped.

#### Kill switch

Visitors can disable the overlay locally:

```js
localStorage.setItem("rx_off", "1"); // disables sending and receiving
localStorage.removeItem("rx_off");   // re-enable
```

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
