# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Bun workspace driven by Turborepo. It holds **kai**, an engine for top-down pixel-art walking games (Phaser 4, Ink dialogue, generated maps, LimeZu art), and the games built on it:

- `apps/datagutt`: datagutt.no, the portfolio site as a game, "Fjord Town", with a plain-text twin, the Journal. Next.js 16.3. See `apps/datagutt/CLAUDE.md`.
- `apps/sandbox`: the smallest kai game. It proves the engine needs nothing from Fjord Town and is the template for new games.
- `packages/kai*`: the engine, as TypeScript source with no build step.
- `tooling/`: shared TypeScript, ESLint and Vitest presets.

## Docs and session workflow

- Engine: `docs/kai/`. Start with `ARCHITECTURE.md`; then `PLUGINS.md`, `CONTENT.md` and `NEW-GAME.md` as needed. Decisions in `docs/kai/DESIGN.md` are settled.
- Fjord Town: `apps/datagutt/docs/` (`DESIGN.md`, `PLAN.md`, `ART.md`, `README.md` for the workflow).
- Each package has a README saying what it is and what it must not import.
- The SessionStart hook prints the handoff for the branch: `docs/kai/` on `kai` branches, `apps/datagutt/docs/` otherwise. The Stop hook asks for a HANDOFF.md update when there are newer code commits.

## Commands

```bash
# From the repository root (Turborepo runs the task in every workspace)
bun install              # Install dependencies (Bun 1.4; the lockfile is version 2)
bun run dev              # Content and assets, then every app's dev server
bun run build            # Content and assets, then the production builds
bun run lint             # ESLint, including the import boundaries
bun run typecheck        # tsc --noEmit
bun run test             # Vitest unit tests
bun run world:check      # Fail if generated maps are stale or invalid
bun run test:e2e         # Build, then every app's Playwright tests
bun run format           # Prettier
bunx turbo run <task> --filter=<app or package>   # One workspace only
```

The `kai` command (from `@datagutt/kai-assets`) runs inside an app folder: `kai content`, `kai assets`, `kai world gen|check|render`, `kai characters`, `kai art <tool>`, `kai dev`. Each app wraps them as `bun run` scripts. See `docs/kai/ARCHITECTURE.md`.

## Rules the code relies on

- **Import boundaries** (`tooling/eslint-config/boundaries.js`): packages never import an app; runtime packages (`kai`, `kai-net`, `kai-live`, `kai-arcade`, `kai-next`) never import build time packages (`kai-worldgen`, `kai-limezu`, `kai-assets`) and import schemas only with `import type`; the runtime never imports Next or React; `kai-worldgen` and `kai-assets` never import the art adapter `kai-limezu`.
- **No game content in `packages/`.** Content is JSON and Markdown in `apps/<app>/content/`, checked by Zod schemas; behaviour one game needs is a plugin in that app.
- **Licensed pixels never enter this repository**, including packed atlases and renders. The art is in the private `datagutt/datagutt-assets`, used from a sibling checkout (`../datagutt-assets`) or cloned with a token. Without it builds use placeholder art.
- **Imports inside packages carry their `.ts` extension**, and JSON imports that Node reaches need `with { type: "json" }`: Node and Bun load the source directly.
- Code that the build loads (dialogue hosts, map builders) must not import `@datagutt/kai`'s index, which pulls in Phaser. Import by path, such as `@datagutt/kai/data`.
- Dependencies change through `bun add`/`bun remove` in the workspace, never by editing `package.json`.

## Turborepo

`content`, `assets`, `build`, `dev`, `game:dev` and `test:e2e` are never cached: the asset build reads art from outside the repository, and the content bundle depends on schemas in other packages. `typecheck`, `test` and `world:check` run `content` first.

## CI and hosting

- `.github/workflows/ci.yml`: `bun install --frozen-lockfile`, then lint, typecheck, unit tests and `world:check`, then every app's e2e tests.
- Vercel builds `apps/datagutt` (the project's Root Directory). `apps/datagutt/vercel.ts` installs with `npx bun@1.4.2`, because the build image's Bun 1.3 cannot read the lockfile.
