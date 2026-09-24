# Handoff

Last updated: 2026-09-24 (kai session 1)

## Current state

- Decisions are in DESIGN.md (with a changelog of the corrections made while building),
  tasks in PLAN.md. Work happens on `kai`; `game` was fast-forwarded to it at K1.6 and
  the Vercel project builds from `apps/datagutt`.
- Done: K1, K2, K3.1 to K3.4, K4, K5.1, K5.3, K5.4.
- The runtime is `@datagutt/kai`: `createGame(parent, { config, content, live, links,
  externals, plugins })`. Content reaches scenes and UI through `services.data`
  (`GameData`), never through module imports. Fjord Town is `apps/datagutt/game/index.ts`
  plus its plugins in `game/plugins/` (cat, arcade, github, ferry intro, finale,
  presence, journal); summit, the edge lines and the passport achievement are triggers
  in `content/triggers.json`.
- Every stage was checked the same way: asset output byte-identical, generated maps
  unchanged, the Journal's text unchanged, e2e green.

## Waiting on the user

K3.5: moving `seasons/` to `games/datagutt/seasons/` in `datagutt/datagutt-assets` (a
push to another repository). After it, `seasonOverridesDir` in
`packages/kai-assets/src/art/source.ts` returns `games/<id>/seasons`.

## Next step

K5.5 (presence and GitHub plugins into `kai-live`, configured by content), K5.2's unit
tests, K5.6 (`window.__kai`, the old-save e2e), then K6 (kai-next, the sandbox, the
boundary lint) and K7 (docs).

## Gotchas

- Vercel's image ships Bun 1.3, which cannot read the version 2 lockfile, so
  `apps/datagutt/vercel.ts` installs with `npx bun@1.4.2`. The `kai` CLI itself runs on
  the image's Bun.
- `assets`, `build`, `test:e2e` and `content` are never cached by Turborepo.
- `Phaser.Scene` owns `plugins` and `data`: the world scene's fields are `kaiPlugins`
  and `gameData`.
- Code the build loads (the dialogue host and what it imports) must not import
  `@datagutt/kai`'s index: that pulls in Phaser, which needs a browser. Use deep paths
  such as `@datagutt/kai/data`.
- Package imports need explicit `.ts` extensions (Node and Bun load them directly). JSON
  imports that Node can reach need `with { type: "json" }`.
- `kai content` writes `.kai/content.json` and `.kai/config.json`; the game reads both.
- `pkill -f next-server` in a Bash call kills the call's own shell. Use
  `pkill -f "[n]ext-server"`.
- `game:dev` from `apps/datagutt` does not build assets or content first. Run it from the
  root (`turbo run game:dev`) or run `bun run content && bun run assets` before it.
- The finale e2e is slow under a full parallel run on WSL; it has a 70 s budget per
  conversation.
