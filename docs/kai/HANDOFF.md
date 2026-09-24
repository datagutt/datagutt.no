# Handoff

Last updated: 2026-09-24 (kai session 1)

## Current state

- The grilling session settled the engine split. Decisions are in DESIGN.md, tasks in
  PLAN.md. Work happens on the `kai` branch, off `game`.
- K1.1 to K1.4 are done: the site lives in `apps/datagutt`, Bun installs (isolated
  installs, so each workspace has its own `node_modules`), Turborepo runs the tasks.
  Lint, typecheck, unit tests, `world:check`, the build with the licensed art and the
  e2e suite pass locally.
- K1.5 (CI on Bun) is pushed and waiting on its first run.

## Gotchas

- The local Bun is a 1.4.0 canary; `packageManager` pins the released 1.4.2.
- `assets`, `build` and `test:e2e` are never cached by Turborepo: the licensed art sits
  outside the repository, so Turborepo cannot hash it.
- The e2e finale test ("the last stamp leads to the finale") can fail once under a full
  parallel run on WSL. It passes alone.
- `game:dev` from `apps/datagutt` no longer builds assets first. Run it from the root
  (`turbo run game:dev` runs `assets` first) or run `bun run assets` before it.

## Next step

K1.5: check the CI run. Then K1.6: merge into `game` and flip the Vercel Root Directory
(show the user the change first).
