# kai: design record

kai is the engine under Fjord Town, split out so a second game can use it. This file
records the decisions from the grilling session on 2026-09-24. Later sessions must not
re-litigate them. If a decision changes, edit it here and add a line to the changelog.

Related files: [PLAN.md](./PLAN.md) (tasks and progress), [HANDOFF.md](./HANDOFF.md)
(session state).

## 1. Purpose

- A second game is planned. It uses the same art family (LimeZu Modern Exteriors,
  Interiors and Office, 16 px tiles, the character generator sheet format) and the same
  genre (top-down walking, NPCs, Ink dialogue, doors, day and night).
- The engine is internal. Packages are never published, so their APIs can change freely.
- "Generic" means no game content inside `packages/`. It does not mean a polished public
  API.

## 2. Repository

- Bun installs dependencies and runs scripts. Node runs Next (`next dev`, `build`,
  `start`) and Vercel functions stay on the Node runtime, where the WebSocket upgrade is
  proven. Vitest and Playwright stay.
- Turborepo runs the tasks. Remote cache goes through Vercel.
- Layout: `apps/` (games and sites), `packages/` (kai), `tooling/` (shared tsconfig,
  ESLint and Vitest presets), `docs/kai/` (engine docs).
- Apps keep plain names and are private: `apps/datagutt` (the site and Fjord Town),
  `apps/sandbox` (a small proof game). Game 2 starts as a copy of the sandbox.
- Packages are TypeScript source. `exports` point at `src/*.ts`, Next uses
  `transpilePackages`, Bun and Vitest read the source directly. There is no package build
  step. If a package is ever published, add tsdown then.
- ESLint 9 flat config. Boundary rules: `packages/**` never imports `apps/**`, runtime
  packages never import build-time packages, and the runtime stays free of Next and React.

## 3. Packages

All packages use the `@datagutt/kai` prefix, so generic names in the `@datagutt` scope
stay free for other projects.

- `@datagutt/kai`: the runtime. Scenes, entities, effects, audio, input, UI, the dialogue
  runner, saves, the progress system, world runtime (grid, pathfinding, map objects,
  seasons), the character sheet layout, the plugin API and declarative triggers. Phaser
  is a peer dependency. The `kai.json` and content schemas live under
  `@datagutt/kai/schema`, which only build tools import.
- `@datagutt/kai-net`: the ghost room protocol, the client, reconnect logic, and the room
  server. Client and server share the protocol, so they live together.
- `@datagutt/kai-live`: live data. The Lanyard client, the MET Norway weather fetcher,
  GitHub fetchers, the composable WorldState payload, and the `presenceNpc`,
  `githubField` and `repoShelf` plugins.
- `@datagutt/kai-arcade`: the cabinet games and the arcade screen.
- `@datagutt/kai-worldgen`: the art-agnostic map toolkit (autotile math, the map canvas,
  layout, the tile registry, the `.tmj` writer, validation, rendering, the atlas packer).
  Art reaches it through a `SheetSource`, and seasonal tiles through a function. Build
  time only.
- `@datagutt/kai-limezu`: the LimeZu adapter. Terrain blocks, sheets and singles, the
  catalog, palette, generic prefabs, furniture, lighting presets, seasonal rules,
  interiors, landscape features, cut checks and the `LimeZuSheets` source. Prefabs named
  for their role in one game (a town hall, a library) belong to that game.
- `@datagutt/kai-assets`: the asset pipeline and the `kai` CLI (`kai assets`,
  `kai content`, `kai world gen|check|render`, the dev harness).
- `@datagutt/kai-next`: React and Next host glue. The game shell core, the world state
  script, the WebSocket route helper, caching wrappers for live fetchers.

## 4. Data and configuration

- Each app has a `kai.json`: static per-game configuration (id, title, save key,
  timezone, base path, start place, asset source, UI sheets, font, weather fallback,
  live settings). It names secrets only as environment variable names, never values.
  Code (plugins, Ink externals) stays in the app's `createGame()` call.
- Content lives in `apps/<app>/content/` as JSON, and as Markdown with frontmatter for
  prose. The engine owns the schemas for engine concepts (NPCs, places, achievements,
  triggers, playlists, character recipes, credits, strings, presence). The app owns the
  schemas for its own content (for datagutt: profile, projects, experience, skills,
  socials).
- Schemas are Zod 4. `kai content` validates everything, exports JSON Schema for editor
  autocomplete (`$schema` in each file), and writes one typed bundle
  (`.kai/content.json` plus a generated `.d.ts`). The game and the Journal import that
  bundle. Zod never reaches the client bundle.
- Ink stays exactly as it is.
- Map builders stay TypeScript, inside the app. The data they use (sign texts, door
  targets, spawn points, NPC placements) moves to JSON. The generated `.tmj` files are the
  runtime format.
- The tile id registry (`tile-ids.json`, `tile-colors.json`) is per app. Each game's atlas
  holds only the tiles its maps use.
- Engine UI copy comes from `content/strings.json`, which overrides the engine's English
  defaults by key. An unknown key fails the build. One language per game.

## 5. Game behaviour

- Game specific behaviour is a plugin: `createGame({ config, content, plugins })`. A
  `KaiPlugin` can hook setup, map enter, interaction and update, register map object
  types, Ink externals and start menu items.
- Simple rules are declarative triggers in content (for example: entering the map
  `mountain` grants `summit`). Achievements need no code.
- Plugins specific to one game live in `apps/<app>/src/plugins/`. Reusable ones live in a
  package (`kai-live`, `kai-arcade`).
- The debug hook is `window.__kai`.

## 6. Licensed art

- One shared private repo, `datagutt/datagutt-assets`. Shared art stays at its root
  (`limezu/`, `music/`). Game specific art moves to `games/<id>/` (for example
  `games/datagutt/seasons/`). `kai.json` names the repo and the game folder.
- The rule from the Fjord Town design stands: licensed pixels never enter this repo.

## 7. Compatibility

Visitors must not notice the refactor.

- The save key stays `fjordtown.save`, and the save format and version stay the same.
- The URLs `?at=`, `?debug`, `?presence=` and `?weather=` keep working.
- The `rx_off` kill switch keeps its key.
- The ghost room protocol and the `/api/world/ws` path stay the same.
- Only the internal `window.__fjord` hook changes, to `window.__kai`.
- An e2e test loads an old save and checks the progress survives.

## 8. Process

- Work happens on the `kai` branch, off `game`, in the stages of PLAN.md. Every stage
  ends green (lint, typecheck, unit tests, `world:check`, build, e2e).
- Moves use `git mv` so blame survives.
- Stage 1 (Bun, Turborepo, the site moved into `apps/datagutt` unchanged) merges into
  `game` early. Then the Vercel project's Root Directory changes to `apps/datagutt`
  through the Vercel MCP, after the user sees the change.
- Docs: `docs/game/` moves to `apps/datagutt/docs/`. `docs/kai/` holds the engine docs.
  Each package has a short README. The root `CLAUDE.md` covers the monorepo, and
  `apps/datagutt/CLAUDE.md` covers Fjord Town.

## 9. Defaults picked without a question

- Each package runs its own `test`, `typecheck` and `lint` through Turborepo.
- Arcade game ids are strings, checked at build time against the registered games.
- The `kai` CLI lives in `kai-assets`.
- The link preview image and the title art stay in the datagutt app.

## Changelog

- 2026-09-24: first version, from the grilling session.
- 2026-09-24: the character sheet layout belongs to the runtime, not to kai-limezu: the
  runtime animates characters by it, and runtime packages never import build-time ones.
  kai-limezu keeps the LimeZu layer composition.
- 2026-09-24: the content bundle gets no generated `.d.ts`. Its type is `ContentOf` the
  collections' Zod schemas, imported type-only, which gives the same safety without a
  code generator, and Zod still never reaches the client bundle.
- 2026-09-24: places are each game's own collection, not an engine one: what a place
  means differs per game (in Fjord Town, the content it presents). The engine only needs
  a place's id, name, stamp and entrance. The ambience mix stays engine code.
- 2026-09-24: the build reaches game code only through modules `kai.json` names: the art
  adapter (`assets.adapter`, exporting an `ArtAdapter`), the map builders
  (`paths.maps`), the dialogue host (`paths.dialogueHost`) and the harness entry
  (`paths.harness`). This keeps `kai-assets` free of any art family and any one game.
