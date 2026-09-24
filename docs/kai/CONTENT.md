# kai: configuration and content

A game's data is files, not code. `kai.json` configures the game; `content/` holds
everything the game says and shows. `kai content` checks both against Zod schemas and
writes the checked result to `.kai/`, which the game and its site import. Ink dialogue
and map builders are the two exceptions: Ink stays Ink, and maps are TypeScript
(see [ARCHITECTURE.md](./ARCHITECTURE.md)).

## kai.json

One per app, next to its `package.json`. The schema with a comment on every field is
`packages/kai/src/schema/config.ts`; the fields fall into these groups:

- The game: `id`, `title`, `timezone` (its clock and seasons), `startPlace`.
- Saves: `saveKey` and `visitorsOffKey`, the `localStorage` keys. Changing `saveKey`
  loses every visitor's save.
- Where things are: `basePath` (the URL of the built assets) and `paths`, the modules
  the build loads (`maps`, `ink`, `dialogueHost`, `harness`).
- Art: `assets` (the art repository, its local checkout, the token's environment
  variable and the art adapter module), `ui` (the dialogue frame and emote sheet),
  `sprites` (animated strips copied for plugins) and `font`.
- Live data: `live.weather` (the fallback place and MET Norway's required User-Agent)
  and `live.github`.

`kai.json` names secrets only by the environment variable that holds them. Behaviour
(plugins, Ink external functions) is code and stays in the game's `createGame()` call.

## Collections

`content/` holds collections. A collection is either one JSON file,
`content/<name>.json`, or a folder of Markdown files, `content/<name>/*.md`.

- A JSON file may start with `"$schema": "../.kai/schema/<name>.json"` for editor
  completion; the build drops it before validation.
- In a Markdown collection each file is one entry. The YAML frontmatter holds the
  fields and the text below it is the field named as its body. A number in front of
  the file name only orders the files: `10-portfolio.md` is the entry `portfolio`.

The engine owns the collections it reads itself (`ENGINE_COLLECTIONS` in
`packages/kai/src/schema/engine.ts`). Every game has them:

- `characters`: character looks by id, as layers of the art's character generator, with
  optional recolours and a placeholder colour.
- `npcs`: the cast by id, with a name, a place and a typing voice. An NPC's dialogue is
  the Ink knot with the same id.
- `music`: the tracks and which plays where (title, credits, outdoors by time and
  season, indoors by map).
- `achievements`: in passport order.
- `unlocks`: conditions that open gates and locked doors.
- `credits`: the credits page and roll.
- `triggers`: rules without code (see [PLUGINS.md](./PLUGINS.md)).
- `strings`: overrides of the engine's English UI copy, by key. An unknown key fails the
  build.

A game adds its own collections in `content/schema.ts`. `places` is always one of them,
because what a place means differs per game; it extends the engine's `placeInfo` (an
id, a name, whether it gives a stamp, an entrance for `?at=`). Fjord Town adds its
profile, projects, experience, skills, socials and the presence NPC's configuration.

```ts
import {
  ENGINE_COLLECTIONS,
  json,
  markdown,
  z,
  type ContentOf,
} from "@datagutt/kai/schema";
import { placeInfo } from "@datagutt/kai/schema/engine";

export const collections = {
  places: json(z.object({ list: z.array(placeInfo) })),
  quests: markdown(
    z.object({ id: z.string(), title: z.string(), text: z.string() }),
    { body: "text" },
  ),
};

export type Content = ContentOf<typeof ENGINE_COLLECTIONS & typeof collections>;
```

The app reads the bundle as that type (`apps/sandbox/content/index.ts`). There is no
generated type file: `ContentOf` derives the type from the schemas, imported type only,
so Zod stays out of the game's bundle.

## Checks beyond the schemas

- The dialogue host (`paths.dialogueHost`) declares every Ink external function, so a
  call to an unknown one fails the Ink compile. It also lists the ids an external
  accepts, and every `# link:` tag must resolve to a link.
- The music playlist may only name tracks it lists.
- The generated maps must match their builders and pass validation (`kai world check`).
