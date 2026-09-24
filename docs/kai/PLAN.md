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

- [x] **K1.1** Move the site into `apps/datagutt` with `git mv`: `app`, `components`,
      `content`, `game`, `lib`, `world`, `scripts`, `e2e`, `fonts`, `public`, the Next,
      Tailwind, PostCSS, Playwright, Vitest and TypeScript configs, `CREDITS.md`.
      `LICENSE`, `README.md`, `docs/` and `.github/` stay at the root. *Done when* the
      root holds only workspace files.
- [x] **K1.2** Bun workspaces: a root `package.json` (`workspaces`,
      `packageManager: bun`), `bun.lock` in place of `pnpm-lock.yaml`, every `pnpm` call
      in scripts, configs and comments replaced. *Done when* `bun install` from a clean
      clone succeeds.
- [x] **K1.3** Turborepo: `turbo.json` with `assets`, `build`, `dev`, `lint`,
      `typecheck`, `test`, `test:e2e`, `world:check`; root scripts call `turbo run`.
      *Done when* `bun run build` from the root builds the site.
- [x] **K1.4** Paths that assume the repo root: the Geist font path in the asset build,
      `.gitignore` and `.prettierignore` entries, the `.claude` hooks. *Done when* a
      full asset build with the real art matches the old output.
- [x] **K1.5** CI on Bun and Turborepo. *Done when* the workflow passes on the `kai`
      branch.
- [x] **K1.6** Merge into `game`, then set the Vercel Root Directory to `apps/datagutt`
      through the MCP. **Needs the user** to see the change first. *Done when* a
      preview of `game` builds and plays with the licensed art.

## K2: tooling and the loosely coupled packages

Goal: shared presets, and the three packages with the fewest ties to Fjord Town.

- [x] **K2.1** `tooling/tsconfig`, `tooling/eslint-config` (ESLint 9 flat config: `base`,
      `phaser`, `next`) and `tooling/vitest-config`. The app moves to ESLint 9 and
      `eslint-config-next@16`. *Done when* `turbo run lint` passes and a deliberate bad
      import still fails.
- [x] **K2.2** `@datagutt/kai-net`: protocol, ghosts client, reconnect, the room server
      (`lib/world/rooms.ts`) and the dev socket. *Done when* the app imports ghosts and
      rooms from the package and the ghost e2e passes. (There is no ghost e2e: `next start`
      cannot upgrade. The package's socket test and a manual run of the dev harness cover
      it.)
- [x] **K2.3** `@datagutt/kai-arcade`: the cabinet games and the arcade screen. Arcade
      ids become strings. *Done when* both lounge cabinets play and share the best score.
      (The games and a registry of the built-ins moved. The app's registry is typed by its
      id list, so a missing game fails typecheck. `ArcadeScreen` needs the runtime's input
      types, so it moves in K5.1. Both blocks cabinets still record under `blocks`.)
- [x] **K2.4** `@datagutt/kai-live`: the Lanyard client, the WorldState types (from
      `content/live.ts`), the MET weather fetcher with the fallback place as a parameter.
      *Done when* the weather and presence e2e pass. (`fetchWeather` takes the place and
      the User-Agent; the app's `lib/weather.ts` keeps the `'use cache'` wrapper until
      K6.1. The WorldState parser takes the game's empty state.)

## K3: world generation and the asset pipeline

Goal: map building and asset building as packages, driven by `kai.json`.

Order: K3.1 to K3.3, then K4.1 and K4.2, then K3.4 and K3.5. The generic asset CLI needs
the character recipes and music tracks as content, not as app TypeScript.

- [x] **K3.1** `kai.json` schema and the datagutt `kai.json` (asset source, save key,
      timezone, base path, UI sheets, font, weather fallback, GitHub user). *Done when*
      nothing in the build reads `datagutt/datagutt-assets` or `../datagutt-assets` from
      code. (The schema is in `@datagutt/kai/schema`. It holds the build and live fields
      now; the runtime fields (save key, timezone, base path, kill switch) join in K5.1,
      when the runtime can receive them. The art repository's game folder is the config's
      `id`. The asset build output was byte-identical before and after.)
- [x] **K3.2** `@datagutt/kai-limezu`: sheets, catalog, palette, singles, furniture,
      lighting presets, seasons, autotile, the character sheet layout. Prefabs specific
      to the town (the datagutt house, the town hall) move to the app. *Done when* no
      file in the package names a Fjord Town place. (Town buildings are in
      `apps/datagutt/world/gen/prefabs.ts`. `features.building()` and `forest()` take
      prefabs, not ids. The character sheet layout goes to the runtime in K5.1 (DESIGN
      changelog), and the LimeZu layer composition moves with the asset CLI in K3.4.)
- [x] **K3.3** `@datagutt/kai-worldgen`: the `world/gen` toolkit. Map builders, the map
      index, the title waterfront and the snow drafts move to
      `apps/datagutt/world/maps/`. The tile registry and colours move to
      `apps/datagutt/world/`. *Done when* `world:check` passes and the rendered maps
      match the old renders pixel for pixel. (The builders stay in
      `apps/datagutt/world/gen/`, since `world/maps/` holds the generated `.tmj`. The map
      objects, seasons and light shapes moved to `@datagutt/kai` first, with arcade and
      unlock ids as strings checked by the asset build. The asset output, including the
      title render, and `world:gen` are byte-identical.)
- [x] **K3.4** `@datagutt/kai-assets` and the `kai` CLI on Bun: `kai assets`,
      `kai world gen|check|render|catalog`, the dev harness. The link preview image stays
      an app script. *Done when* `public/game/` from the CLI matches the old build.
      (Commands: `kai content|assets|world|characters|art|dev`. The CLI loads the art
      adapter, the maps and the dialogue host from the modules `kai.json` names, so it
      assumes no LimeZu. The adapter's own tools run as `kai art <tool>` (the catalogue).
      The title strip and link preview are `scripts/title.ts`; the snow drafts and
      find-single stay app scripts since they read the town's prefabs. Arcade ids are
      checked by an app test. Output is byte-identical.)
- [ ] **K3.5** Assets repo: move `seasons/` to `games/datagutt/seasons/` in
      `datagutt-assets`, in step with the `kai.json` change. **Needs the user** to approve
      the push to the assets repo. *Done when* a clean build with the token finds the
      snow overrides.

## K4: content as data

Goal: every hardcoded piece of content is a JSON or Markdown resource, validated by Zod.

- [x] **K4.1** `kai content`: loads `content/`, validates with Zod 4, exports JSON Schema,
      writes `.kai/content.json` and its `.d.ts`. Turborepo runs it before `dev`,
      `build`, `typecheck` and `test`. *Done when* a broken file fails with its path and
      the failing field. (No `.d.ts`: the bundle's type is `ContentOf` the schemas,
      imported type-only, see the DESIGN changelog. JSON files are objects so they can
      carry `$schema`; Markdown files are `NN-id.md`.)
- [x] **K4.2** Engine content: NPC roster and voices, places, achievements, unlock ids,
      character recipes, music tracks and playlist rules, credits, ambience layers.
      *Done when* none of them is a TypeScript constant. (Engine collections: characters,
      npcs, music with a declarative playlist, achievements, unlocks with declarative
      conditions, credits. Places are the game's own collection, and `startPlace` is in
      `kai.json`. The ambience mix stays code: it is the engine's audio model over
      layers synthesised in code, not content. The edge lines and the blocks target
      follow in K4.5 and K5.4. Asset output and the Journal's text are unchanged.)
- [x] **K4.3** Site content: profile, socials, skills (JSON), projects and experience
      (Markdown). The Journal reads the bundle. *Done when* `/journal` renders the same
      HTML as before. (The visible text of `/journal` is identical before and after; the
      `content/*.ts` modules are thin typed accessors now.)
- [x] **K4.4** Map data: sign texts, door targets, spawn points and NPC placements move
      from the map builders to JSON. *Done when* `world:check` shows no diff. (The copy
      moved: map names and 65 sign and shut-door texts, in `content/mapText.json` by map
      and key. Positions, doors, spawns and NPC placements stay in the builders: they are
      layout, computed from the builders' own geometry, and as JSON they would become
      loose numbers. NPC names already come from `npcs.json`. A test fails on unused copy.)
- [x] **K4.5** `content/strings.json` with the engine's English defaults. *Done when* no
      engine UI file has a visible string literal. (Defaults in
      `@datagutt/kai/ui/strings`; the `strings` collection rejects unknown keys. The
      cat, the binoculars by day and the edge-of-the-world lines are Fjord Town's words,
      so they became Ink knots in `world.ink` (the edge lines cycle), not strings. The
      presence status lines follow in K5.5.)

## K5: the runtime and the plugin API

Goal: `@datagutt/kai` holds no Fjord Town behaviour.

Order: the plugin API and the triggers are built inside the app first (K5.2, K5.3), and
each piece of Fjord Town behaviour moves into a plugin there (K5.4, K5.5) with e2e green
after each. Only then does the now generic runtime move into the package (K5.1): moving
it first would make the package import app code.

- [x] **K5.1** `@datagutt/kai`: move the engine parts of `game/`. `createGame({ config,
      content, plugins })` replaces `bootGame`. `ArcadeScreen` moves to `kai-arcade`, which
      then depends on `kai`. *Done when* the app boots through `createGame`. (The runtime
      reads content through `GameData` on `services.data`, not module imports. It takes
      the live payload as `{ weather, ...slices }`; the weather types live in the runtime
      and `kai-live` depends on it, so there is no package cycle. The save key and the
      visitors kill switch come from `kai.json`. The triggers plugin is built in.)
- [x] **K5.2** `KaiPlugin` API: setup, map enter, interaction, update, map object types,
      Ink externals, start menu items. *Done when* the API has unit tests with a fake
      scene. (`@datagutt/kai/plugins/api`. Unit tests drive the triggers plugin through a
      fake `World` and cover `GameData`; the world scene's dispatch to the hooks needs
      Phaser, so the e2e suite covers it through Fjord Town's plugins.)
- [x] **K5.3** Declarative triggers in content (enter map, talk to NPC, finish knot,
      flag set) that grant achievements and set flags. *Done when* `summit` comes from a
      trigger. (`content/triggers.json`: `enterMap`, `bumpEdge`, `passportFull`, each able
      to play a knot, grant and set a flag. Summit, the edge lines and the passport
      achievement are triggers.)
- [x] **K5.4** Move Fjord Town behaviour out of `WorldScene` into app plugins: the
      ferry intro, the cat, edge lines, the finale, the passport, the credits link.
      *Done when* `WorldScene` names no NPC, map or knot of Fjord Town. (Plugins in
      `game/plugins/`: triggers, cat, arcade, github, ferry intro, finale, presence,
      journal. The finale's night is the engine's generic `services.night`. The passport
      itself stays engine: stamps are a place's `stamp` flag.)
- [x] **K5.5** `presenceNpc`, `githubField` and `repoShelf` plugins in `kai-live`,
      configured by `content/presence.json` and `kai.json`. The mock presences move to
      JSON. *Done when* the `?presence=` e2e pass. (`presenceNpc` with its rules, words,
      routes, story-night place and mocks in `presence.json`; the field and the shelf are
      one `githubObjects` plugin, since both only draw map objects from the same data.
      The plugins sit at `@datagutt/kai-live/presence/plugin` and `.../github/plugin`,
      off the index the Next server imports.)
- [x] **K5.6** `window.__fjord` becomes `window.__kai`. A new e2e test loads a save
      in the old format and checks the stamps survive. *Done when* all e2e pass. (Also
      `__fjordPresence` → `__kaiPresence` and the debug field `thomas` → `liveNpc`.)

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
