# Handoff

Last updated: 2026-09-24 (kai session 1)

## Current state

- Decisions are in DESIGN.md (with a changelog of the corrections made while building),
  tasks in PLAN.md. Work happens on `kai`; `game` was fast-forwarded to it at K1.6 and
  the Vercel project builds from `apps/datagutt` (Root Directory flipped with the user's
  approval, preview verified with the licensed art).
- Done: K1 (Bun, Turborepo, CI, Vercel), K2 (tooling presets, kai-net, kai-arcade,
  kai-live), K3.1 to K3.3 (kai.json, kai-worldgen, kai-limezu), K4.1 to K4.3 (`kai
  content`, engine and site content as JSON and Markdown).
- Every stage was checked the same way: the asset output byte-identical to before, the
  generated maps unchanged, the Journal's visible text unchanged, e2e green.

## Next step

K3.4: move the asset pipeline (`scripts/assets`, `scripts/world`) into the `kai` CLI in
`@datagutt/kai-assets`, running on Bun. The link preview image and the title strip stay
an app script. Then K3.5 (assets repo move, needs the user), K4.4, K4.5, K5.

## Gotchas

- `packageManager` pins Bun 1.4.2. Vercel's image ships Bun 1.3, which cannot read the
  version 2 lockfile, so `apps/datagutt/vercel.ts` installs with `npx bun@1.4.2`.
- `assets`, `build`, `test:e2e` and `content` are never cached by Turborepo: the art
  sits outside the repository, and the content bundle also depends on the engine's
  schemas in `packages/`.
- Node's type stripping loads package `.ts` files through the workspace symlinks, so
  imports need explicit `.ts` extensions and erasable syntax. JSON imports that Node can
  reach (content/index.ts, content/places.ts) need `with { type: "json" }`.
- Content types come from `ContentOf` the schemas (`content/schema.ts` in the app), so
  ids that were literal unions (place, music, achievement) are plain strings now.
- `pkill -f next-server` in a Bash call kills the call's own shell. Use
  `pkill -f "[n]ext-server"`.
- The e2e finale test ("the last stamp leads to the finale") fails now and then under a
  full parallel run on WSL. It passes alone.
- `game:dev` from `apps/datagutt` does not build assets or content first. Run it from the
  root (`turbo run game:dev`) or run `bun run content && bun run assets` before it.
