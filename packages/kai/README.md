# @datagutt/kai

The kai runtime: everything a game runs in the browser. `createGame(parent, options)`
starts a game from its config, content, live data and plugins. Inside are the Phaser
scenes, entities, input, UI, effects, synthesised audio, the Ink dialogue runner, saves,
progress and the passport, the world runtime (grid, pathfinding, map objects, seasons,
day and night), `GameData`, the plugin API and the triggers plugin.

- `@datagutt/kai`: `createGame`, `GameData` and the plugin types.
- `@datagutt/kai/schema`: the Zod schemas of `kai.json` and the engine's content
  collections, for the build. Runtime code imports only their types.
- `@datagutt/kai/<path>`: any other module, for plugins that need it.

Phaser is a peer dependency.

**Must not import:** any app, the build time packages (`kai-worldgen`, `kai-limezu`,
`kai-assets`), Next or React. Outside `src/schema/`, schema modules only with
`import type`.

See [docs/kai/ARCHITECTURE.md](../../docs/kai/ARCHITECTURE.md) and
[docs/kai/PLUGINS.md](../../docs/kai/PLUGINS.md).
