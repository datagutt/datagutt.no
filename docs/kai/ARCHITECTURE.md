# kai: architecture

kai is the engine behind Fjord Town: a top-down pixel-art walking game with NPCs, Ink
dialogue, doors, a passport, day and night, weather and other visitors as ghosts. It
exists as packages so that a second game can reuse all of it and bring only its own
content, maps, dialogue and plugins. The decisions behind this layout are in
[DESIGN.md](./DESIGN.md).

Other pages: [PLUGINS.md](./PLUGINS.md) (the plugin API and triggers),
[CONTENT.md](./CONTENT.md) (`kai.json` and the content collections),
[NEW-GAME.md](./NEW-GAME.md) (start a new game from the sandbox).

## Runtime and build time

Every package is on one side of a line, and the line is what keeps the browser bundle
small and the engine free of any one game.

- **Runtime** code runs in the visitor's browser (or, for live data, on the server
  that renders the page). It is `@datagutt/kai`, `kai-net`, `kai-live`, `kai-arcade`,
  and the host glue `kai-next`.
- **Build time** code runs in `kai` CLI commands and never ships: `kai-worldgen`,
  `kai-limezu` and `kai-assets`.
- The schemas sit on the line. `@datagutt/kai/schema` (and `kai-live`'s
  `presence/config.ts`) is Zod, which only the build runs. Runtime code imports only
  their types, so it reads already validated JSON without carrying Zod.

ESLint enforces this (`tooling/eslint-config/boundaries.js`): packages never import an
app, runtime code never imports build time packages or schema values, the runtime
never imports Next or React, and the map toolkit and asset build never import an art
adapter.

## Packages

- `@datagutt/kai`: the runtime. `createGame()`, the Phaser scenes, entities, input, UI,
  effects, synthesised audio, the Ink dialogue runner, saves, progress and the passport,
  the world runtime (grid, pathfinding, map objects, seasons, day and night), the
  character sheet layout, `GameData`, the plugin API and the triggers plugin. Phaser is
  a peer dependency.
- `@datagutt/kai-net`: other visitors. The ghost room protocol, the browser client with
  reconnects, the room logic and a Node attachment for the socket server.
- `@datagutt/kai-live`: live data. Lanyard (Discord presence), MET Norway weather, the
  GitHub fetchers, the WorldState payload a page embeds, and two plugins:
  `presenceNpc` (an NPC who follows someone's Discord presence) and `githubObjects`
  (map objects drawn from GitHub data).
- `@datagutt/kai-arcade`: small cabinet games and the arcade screen that runs them.
- `@datagutt/kai-next`: running a kai game inside a Next page. The `useKaiGame` and
  `useMenuKeys` hooks, the live data script, cached wrappers for the live fetchers and
  the world socket route handler.
- `@datagutt/kai-worldgen`: the map toolkit with no art of its own. The map canvas,
  autotiling, layout helpers, the tile registry, the `.tmj` writer, validation,
  rendering and the atlas packer. Art reaches it through a `SheetSource`.
- `@datagutt/kai-limezu`: the art adapter for LimeZu's Modern Exteriors, Interiors and
  Office packs. Terrain blocks, sheet and single references, the catalogue, generic
  prefabs, furniture, lighting, seasonal rules, interiors, landscape features, cut
  checks and character composition.
- `@datagutt/kai-assets`: the asset pipeline and the `kai` command.

Dependencies point one way. `kai-net` depends on nothing of kai. `kai` depends on
`kai-net`. `kai-live`, `kai-arcade`, `kai-worldgen` and `kai-limezu` depend on `kai`.
`kai-next` depends on `kai`, `kai-live` and `kai-net`. `kai-assets` depends on `kai`,
`kai-net` and `kai-worldgen`, and reaches the art adapter only through the module that
`kai.json` names.

`tooling/` holds the shared TypeScript, ESLint and Vitest presets.

## How a game is put together

1. `kai.json` is the game's static configuration: its id, save key, time zone, start
   place, asset source and the modules the build loads.
2. `kai content` checks `content/` and `kai.json` against their schemas and writes
   `.kai/content.json`, `.kai/config.json` and JSON Schemas under `.kai/schema/` (the
   content files point at them with `$schema` for editor completion).
3. `kai world gen` runs the game's map builders (TypeScript in the app) and writes
   `world/maps/*.tmj` plus the tile registry. The `.tmj` files are committed, and
   `kai world check` fails CI when they are stale.
4. `kai assets` fetches the licensed art, then builds `public/<basePath>`: the tile
   atlas, character sheets and portraits, the bitmap font, UI sheets, music and the
   compiled Ink.
5. At runtime the game calls `createGame(parent, options)` with its config, content,
   live data, plugins, Ink externals and link resolver. Content reaches scenes and UI through `services.data` (a
   `GameData`), never through module imports, so the engine holds no game's content.

## The kai command

Run it from an app's folder (the one with `kai.json`). Each app's `package.json` wraps
the commands as scripts, and Turborepo runs `content` and `assets` before anything that
needs them.

- `kai content`: check `content/` and `kai.json`, write `.kai/`.
- `kai assets`: fetch the art, then build `public/<basePath>`.
- `kai world gen`: write the maps. `kai world check` fails if they are stale or
  invalid. `kai world render` draws them to `world/out/*.png` (`--collision`, `--grid`,
  `--objects`, `--only=<map>`).
- `kai characters`: a contact sheet of every character, for review.
- `kai art <tool>`: a tool of the art adapter, such as `catalog`.
- `kai dev`: the standalone game harness with live reload, serving the world socket
  locally. It bundles the module named by `paths.harness`.

## Licensed art

The art lives in the private repository `datagutt/datagutt-assets`, never in this one.
`kai assets` uses a local checkout at `assets.localPath` when there is one, clones the
repository with the token in the environment variable `assets.tokenEnv` when there is
not, and draws placeholder art when neither works. Shared art sits at the root of that
repository; one game's own art sits under `games/<id>/`.

## Turborepo

`content`, `assets`, `build`, `dev`, `game:dev` and `test:e2e` are never cached.
The asset build reads art from outside the repository, which Turborepo cannot hash, and
the content bundle also depends on schemas in other packages. `typecheck`, `test` and
`world:check` depend on `content`, since they import the bundle.

## Gotchas

- Packages are TypeScript source with no build step. Node and Bun load them directly,
  so relative imports need their `.ts` extension, and JSON imports that Node reaches
  need `with { type: "json" }`. Next compiles them through `transpilePackages`.
- Code the build loads (a dialogue host and what it imports) must not import
  `@datagutt/kai`'s index: that pulls in Phaser, which needs a browser. Import by path,
  such as `@datagutt/kai/data`.
- `Phaser.Scene` already has `plugins` and `data`, so the world scene calls its own
  `kaiPlugins` and `gameData`.
- Map object types are one closed union in `packages/kai/src/world/objects.ts`, parsed
  there too. A plugin can place any of them, but a new type is an engine change.
