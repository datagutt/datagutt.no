# @datagutt/kai-next

Running a kai game inside a Next page.

- `./game`: `useKaiGame`, which loads the game module behind the page's own title
  screen, reports progress and starts or continues the game.
- `./menu-keys`: `useMenuKeys`, keyboard and pad navigation for that title screen.
- `./live-data`: `LiveDataScript`, which embeds the live data for the game.
- `./github`, `./weather`: `@datagutt/kai-live`'s fetchers behind `'use cache'`.
- `./world-socket`: `worldSocketHandler()`, a route handler serving the ghost rooms
  over `@vercel/functions`' WebSocket upgrade.

Next, React and `@vercel/functions` are peer dependencies.

**Must not import:** any app or the build time packages; schema modules only with
`import type`.
