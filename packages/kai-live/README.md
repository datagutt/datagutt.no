# @datagutt/kai-live

Live data for a game and the page around it, and the plugins that show it in the world.

- `.`: the WorldState payload a page embeds and the game reads, the Lanyard client
  (Discord presence), MET Norway weather and the GitHub data types.
- `./github/fetch`: framework-free GitHub fetchers (pinned repos, stats, the
  contribution calendar). `@datagutt/kai-next/github` wraps them in Next's cache.
- `./presence/plugin`: `presenceNpc`, an NPC who follows someone's Discord presence
  between maps. `./presence/config` is its content schema (`content/presence.json`).
- `./github/plugin`: `githubObjects`, map objects drawn from GitHub data. Their types
  (`cropsObject`, `booksObject`) are in `./github/objects`, for map builders and the
  game's `MAP_OBJECTS`.

**Must not import:** any app, the build time packages, Next or React. Schema modules
(including `./presence/config` from the plugin side) only with `import type`.
