# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio site for datagutt, built with **Next.js 16** (canary), **React 19**, and **TypeScript**. Uses **pnpm** as package manager.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint (Next.js config)
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

## Key Configuration

- **React Compiler** enabled (`babel-plugin-react-compiler`)
- **View Transitions** enabled experimentally
- **Inline CSS** enabled via Next.js experimental config
- **Path alias**: `@/*` maps to project root
- **TypeScript strict mode** enabled
