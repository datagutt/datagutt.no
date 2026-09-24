# Handoff

Last updated: 2026-09-24 (kai session 1)

## Current state

- The grilling session settled the engine split. Decisions are in DESIGN.md, tasks in
  PLAN.md. Work happens on the `kai` branch, off `game`.
- K1.1 to K1.5 are done: the site lives in `apps/datagutt`, Bun installs (isolated
  installs, so each workspace has its own `node_modules`), Turborepo runs the tasks, CI
  runs on Bun and passes.
- K2.1 is done: `tooling/` holds the tsconfig, ESLint 9 flat config and Vitest presets.
- K2.2 is done: `@datagutt/kai-net` holds the ghost protocol, client, reconnect, rooms
  and the Node socket server. `Facing` lives in its protocol.
- `apps/datagutt/vercel.ts` sets the Vercel install and build commands (Turborepo from
  the repository root, so `assets` runs before `next build`).

## Blocked on the user

K1.6: the user must approve setting the Vercel project's Root Directory to
`apps/datagutt` (project `prj_p08fce0IPL6JbrShucM7GGQhuBjI`, team
`team_XkRYw9JzRve6csIDU6c9qnGf`). After the approval: flip it through the MCP,
fast-forward `game` to `kai`, push, and check that the preview used the licensed art.
Until then, every Vercel preview of `kai` fails, because the project still builds from
the repository root.

## Gotchas

- The local Bun is a 1.4.0 canary; `packageManager` pins the released 1.4.2. Watch the
  first Vercel build for lockfile trouble (`bun.lock` is lockfile version 2).
- `assets`, `build` and `test:e2e` are never cached by Turborepo: the licensed art sits
  outside the repository, so Turborepo cannot hash it.
- Next compiles the kai packages from source: `next.config.mjs` passes every
  `@datagutt/kai*` dependency to `transpilePackages`.
- A tooling preset that imports a tool (Vitest, ESLint) needs it as a peer dependency,
  or isolated installs cannot resolve it.
- Node's type stripping loads package `.ts` files through the workspace symlinks, so
  package imports need explicit `.ts` extensions and erasable syntax only, until the
  scripts move to Bun in K3.4.
- The e2e finale test ("the last stamp leads to the finale") can fail once under a full
  parallel run on WSL. It passes alone.
- `game:dev` from `apps/datagutt` does not build assets first. Run it from the root
  (`turbo run game:dev` runs `assets` first) or run `bun run assets` before it.

## Next step

K1.6 once the user approves, then K2.3 (`@datagutt/kai-arcade`).
