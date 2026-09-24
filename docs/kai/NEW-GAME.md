# Start a new game from the sandbox

`apps/sandbox` is the smallest complete kai game: one map, one NPC, one Ink knot, two
triggers. It proves the engine needs nothing from Fjord Town, and it is the template for
the next game. These steps make `apps/<name>` from it.

## Copy it

1. Copy the folder: `cp -r apps/sandbox apps/<name>`. Leave out `node_modules`,
   `.kai`, `public/game`, `.assets-cache` and `world/out` if they exist.
2. In `apps/<name>/package.json`, set `name` to `<name>`.
3. In `kai.json`, set `id`, `title`, `timezone`, `saveKey` and `visitorsOffKey`. The keys
   must differ from every other game on the same domain, or the games share saves.
4. Set `assets.tokenEnv` to the environment variable that CI and the host will use for
   the art repository token.
5. In `playwright.config.ts`, pick a port no other app uses.
6. Run `bun install` at the repository root, so Bun links the new workspace.

## Make it yours

1. Places: edit `content/places.json`. `startPlace` in `kai.json` must name one with an
   entrance.
2. Maps: write builders in `world/maps.ts` (or a folder of them) and list them in
   `GENERATED_MAPS`. Run `bun run world:gen`, then commit `world/maps/*.tmj` and the tile
   registry beside them.
3. Cast: add looks to `content/characters.json` and people to `content/npcs.json`.
   Place each NPC on a map with an `npc` object. Run `bunx kai characters` to review
   the looks.
4. Dialogue: write Ink in `dialogue/`, starting at `main.ink`. Each NPC talks from the
   knot with their id. If the dialogue calls external functions, declare them in
   `dialogue/host.ts` and bind them in `createGame`'s `externals`.
5. Rules: add achievements to `content/achievements.json` and triggers to
   `content/triggers.json`. Reach for a plugin only when a trigger cannot say it (see
   [PLUGINS.md](./PLUGINS.md)).
6. Words: override engine UI copy in `content/strings.json`, and fill in
   `content/music.json` and `content/credits.json`.

## Run it

- `bunx turbo run dev --filter=<name>` builds the content and assets, then starts the
  harness from `src/main.ts`. Add `?debug` to the URL for the debug overlay and
  `window.__kai`.
- `bunx turbo run lint typecheck world:check test:e2e --filter=<name>` is what CI
  runs for it.

## Host it

The sandbox boots straight into the world from a plain page. To put a game behind a Next
site, as Fjord Town does, depend on `@datagutt/kai-next`. `useKaiGame` loads the game
behind the page's own title screen, `LiveDataScript` embeds live data, and
`worldSocketHandler()` serves other visitors from a route. `apps/datagutt` is the
example: `components/game/GameShell.tsx` and `app/api/world/ws/route.ts`.

## Art of its own

Art used only by this game belongs under `games/<id>/` in the art repository, such as
its hand-drawn season overrides in `games/<id>/seasons/<season>/`. Art shared by more
than one game stays at the repository's root.
