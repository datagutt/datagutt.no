# kai: implementation plan

This file is the source of truth for the progress of the engine split. Tick a box in the
same commit as the work that completes it. Decisions live in [DESIGN.md](./DESIGN.md),
session state in [HANDOFF.md](./HANDOFF.md).

Task format: `- [x] **K1.3** Title: what to do. *Done when* the observable check.`
Every stage ends green: lint, typecheck, unit tests, `world:check`, build and e2e.
Commit and push after each finished task.

---

## K1: Bun, Turborepo and the site in `apps/datagutt`

Goal: the same site, built by Bun and Turborepo from its new place. No behaviour change.

- [ ] **K1.1** Move the site into `apps/datagutt` with `git mv`: `app`, `components`,
      `content`, `game`, `lib`, `world`, `scripts`, `e2e`, `fonts`, `public`, the Next,
      Tailwind, PostCSS, Playwright, Vitest and TypeScript configs, `CREDITS.md`.
      `LICENSE`, `README.md`, `docs/` and `.github/` stay at the root. *Done when* the
      root holds only workspace files.
- [ ] **K1.2** Bun workspaces: a root `package.json` (`workspaces`,
      `packageManager: bun`), `bun.lock` in place of `pnpm-lock.yaml`, every `pnpm` call
      in scripts, configs and comments replaced. *Done when* `bun install` from a clean
      clone succeeds.
- [ ] **K1.3** Turborepo: `turbo.json` with `assets`, `build`, `dev`, `lint`,
      `typecheck`, `test`, `test:e2e`, `world:check`; root scripts call `turbo run`.
      *Done when* `bun run build` from the root builds the site.
- [ ] **K1.4** Paths that assume the repo root: the Geist font path in the asset build,
      `.gitignore` and `.prettierignore` entries, the `.claude` hooks. *Done when* a
      full asset build with the real art matches the old output.
- [ ] **K1.5** CI on Bun and Turborepo. *Done when* the workflow passes on the `kai`
      branch.
- [ ] **K1.6** Merge into `game`, then set the Vercel Root Directory to `apps/datagutt`
      through the MCP. **Needs the user** to see the change first. *Done when* a
      preview of `game` builds and plays with the licensed art.

## K2: tooling and the loosely coupled packages

Goal: shared presets, and the three packages with the fewest ties to Fjord Town.

- [ ] **K2.1** `tooling/tsconfig`, `tooling/eslint-config` (ESLint 9 flat config: `base`,
      `phaser`, `next`) and `tooling/vitest-config`. The app moves to ESLint 9 and
      `eslint-config-next@16`. *Done when* `turbo run lint` passes and a deliberate bad
      import still fails.
- [ ] **K2.2** `@datagutt/kai-net`: protocol, ghosts client, reconnect, the room server
      (`lib/world/rooms.ts`) and the dev socket. *Done when* the app imports ghosts and
      rooms from the package and the ghost e2e passes.
- [ ] **K2.3** `@datagutt/kai-arcade`: the cabinet games and the arcade screen. Arcade
      ids become strings. *Done when* both lounge cabinets play and share the best score.
- [ ] **K2.4** `@datagutt/kai-live`: the Lanyard client, the WorldState types (from
      `content/live.ts`), the MET weather fetcher with the fallback place as a parameter.
      *Done when* the weather and presence e2e pass.

## K3: world generation and the asset pipeline

Goal: map building and asset building as packages, driven by `kai.json`.

- [ ] **K3.1** `kai.json` schema and the datagutt `kai.json` (asset source, save key,
      timezone, base path, UI sheets, font, weather fallback, GitHub user). *Done when*
      nothing in the build reads `datagutt/datagutt-assets` or `../datagutt-assets` from
      code.
- [ ] **K3.2** `@datagutt/kai-limezu`: sheets, catalog, palette, singles, furniture,
      lighting presets, seasons, autotile, the character sheet layout. Prefabs specific
      to the town (the datagutt house, the town hall) move to the app. *Done when* no
      file in the package names a Fjord Town place.
- [ ] **K3.3** `@datagutt/kai-worldgen`: the `world/gen` toolkit. Map builders, the map
      index, the title waterfront and the snow drafts move to
      `apps/datagutt/world/maps/`. The tile registry and colours move to
      `apps/datagutt/world/`. *Done when* `world:check` passes and the rendered maps
      match the old renders pixel for pixel.
- [ ] **K3.4** `@datagutt/kai-assets` and the `kai` CLI on Bun: `kai assets`,
      `kai world gen|check|render|catalog`, the dev harness. The link preview image stays
      an app script. *Done when* `public/game/` from the CLI matches the old build.
- [ ] **K3.5** Assets repo: move `seasons/` to `games/datagutt/seasons/` in
      `datagutt-assets`, in step with the `kai.json` change. **Needs the user** to approve
      the push to the assets repo. *Done when* a clean build with the token finds the
      snow overrides.

## K4: content as data

Goal: every hardcoded piece of content is a JSON or Markdown resource, validated by Zod.

- [ ] **K4.1** `kai content`: loads `content/`, validates with Zod 4, exports JSON Schema,
      writes `.kai/content.json` and its `.d.ts`. Turborepo runs it before `dev`,
      `build`, `typecheck` and `test`. *Done when* a broken file fails with its path and
      the failing field.
- [ ] **K4.2** Engine content: NPC roster and voices, places, achievements, unlock ids,
      character recipes, music tracks and playlist rules, credits, ambience layers.
      *Done when* none of them is a TypeScript constant.
- [ ] **K4.3** Site content: profile, socials, skills (JSON), projects and experience
      (Markdown). The Journal reads the bundle. *Done when* `/journal` renders the same
      HTML as before.
- [ ] **K4.4** Map data: sign texts, door targets, spawn points and NPC placements move
      from the map builders to JSON. *Done when* `world:check` shows no diff.
- [ ] **K4.5** `content/strings.json` with the engine's English defaults. *Done when* no
      engine UI file has a visible string literal.

## K5: the runtime and the plugin API

Goal: `@datagutt/kai` holds no Fjord Town behaviour.

- [ ] **K5.1** `@datagutt/kai`: move the engine parts of `game/`. `createGame({ config,
      content, plugins })` replaces `bootGame`. *Done when* the app boots through
      `createGame`.
- [ ] **K5.2** `KaiPlugin` API: setup, map enter, interaction, update, map object types,
      Ink externals, start menu items. *Done when* the API has unit tests with a fake
      scene.
- [ ] **K5.3** Declarative triggers in content (enter map, talk to NPC, finish knot,
      flag set) that grant achievements and set flags. *Done when* `summit` comes from a
      trigger.
- [ ] **K5.4** Move Fjord Town behaviour out of `WorldScene` into app plugins: the
      ferry intro, the cat, edge lines, the finale, the passport, the credits link.
      *Done when* `WorldScene` names no NPC, map or knot of Fjord Town.
- [ ] **K5.5** `presenceNpc`, `githubField` and `repoShelf` plugins in `kai-live`,
      configured by `content/presence.json` and `kai.json`. The mock presences move to
      JSON. *Done when* the `?presence=` e2e pass.
- [ ] **K5.6** `window.__fjord` becomes `window.__kai`. A new e2e test loads a save
      in the old format and checks the stamps survive. *Done when* all e2e pass.

## K6: Next glue, the sandbox and the boundaries

Goal: a second app proves the engine needs nothing from datagutt.

- [ ] **K6.1** `@datagutt/kai-next`: the game shell core, the world state script, the
      WebSocket route helper, caching wrappers. *Done when* the datagutt app keeps only
      its title art, Journal and site pages.
- [ ] **K6.2** `apps/sandbox`: one generated map, one NPC, one Ink knot, one trigger,
      placeholder art, booted by the kai dev harness. *Done when* it runs without the
      assets token.
- [ ] **K6.3** A Playwright smoke test for the sandbox (walk to the NPC, talk) in CI.
      *Done when* CI runs it.
- [ ] **K6.4** Boundary lint: `packages/** ↛ apps/**`, runtime packages ↛ build-time
      packages, `kai` ↛ Next and React. *Done when* a deliberate bad import fails CI.

## K7: docs

- [ ] **K7.1** Move `docs/game/` to `apps/datagutt/docs/` and update the `.claude` hooks.
      *Done when* the SessionStart hook prints the right handoff on both branches.
- [ ] **K7.2** `docs/kai/`: architecture and package map, plugin API, content schemas,
      the CLI, "start a new game from the sandbox". *Done when* written.
- [ ] **K7.3** A README per package (what it is, what it must not import). A root
      `CLAUDE.md` for the monorepo, `apps/datagutt/CLAUDE.md` for Fjord Town. *Done when*
      written.
