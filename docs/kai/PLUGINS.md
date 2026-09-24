# kai: plugins and triggers

The engine runs the parts every game shares: walking, doors, signs, NPCs, dialogue, the
passport, saves. Anything one game does that another would not is a plugin, or, when it
is a simple rule, a trigger in content. The engine never names a game's plugin.

The types are in `packages/kai/src/plugins/api.ts`. Plugins that more than one game can
use live in packages (`kai-live`, `kai-arcade`); the rest live in the app (Fjord Town's
are in `apps/datagutt/game/plugins/`).

## Triggers first

A rule that only reacts to the world and grants something needs no code. Put it in
`content/triggers.json`:

```json
{
  "list": [
    { "on": "enterMap", "map": "mountain", "delay": 600, "grant": "summit" },
    {
      "on": "bumpEdge",
      "cooldown": 20000,
      "knot": "edge_of_world",
      "grant": "edge"
    },
    { "on": "passportFull", "grant": "passport", "announce": false }
  ]
}
```

- `enterMap` fires as the player arrives on `map`, after `delay` ms.
- `bumpEdge` fires when the player walks into the map's edge, at most once per
  `cooldown` ms, and never while a conversation is open.
- `passportFull` fires on every map load while every stamp is in, and when the last
  stamp is earned. Keep it to granting: a knot on it would play again on every map.

Each trigger plays `knot` (narrated) if given, then sets `flag` and grants the
achievement `grant`. `announce: false` grants it without the banner. The engine runs the
triggers as a plugin ahead of the game's own, and the `critters` of `kai.json` (animals
that get away from the player) the same way.

## Writing a plugin

A plugin is an object with a `name` and any of the hooks below, usually made by a
function that takes its configuration:

```ts
import { perWorld, type KaiPlugin } from "@datagutt/kai";

export function bellPlugin(): KaiPlugin {
  const state = perWorld(() => ({ rung: 0 }));
  return {
    name: "bell",
    usableAt(world, tile) {
      if (world.map !== "church" || tile.x !== 5 || tile.y !== 2) return null;
      return {
        prompt: "Use",
        use: () =>
          state(world).rung++ === 2
            ? world.achieve("bellringer")
            : world.save(),
      };
    },
    debug: (world) => ({ bellRung: state(world).rung }),
  };
}
```

Pass it to `createGame(parent, { ..., plugins: [bellPlugin()] })`. Plugins run in the
order given. That order is also the order of their start menu items, and the first
plugin that answers a question (a usable tile, a prompt, a talk) wins.

## The hooks

- `boot(services, params)`: once, before anything loads. It may change where the game
  starts (`services.start`). Returning `start: true` skips the title; `stop` runs when
  the game is destroyed.
- `externals(ctx)`: Ink external functions this plugin implements. They are bound beside
  the game's own `externals`, and the game's dialogue host must declare them for the
  Ink compile check.
- `objects`: the map object types this plugin places, as `[descriptor.place(fn)]`. The
  world calls `fn` for each object of that type as the map loads (see "Map object
  types" below). The engine places spawns, doors, signs, spots, areas, gates, lights and
  NPCs itself, and animated `sprite`s (a kai.json strip looping at a tile, for a season
  or a time of day if asked). An object of a type no plugin places is skipped with a
  warning.
- `mapCreated(world)`: after the map, its objects and the player are in place.
- `usableAt(world, tile)`: what the player can use on a tile. It is asked before signs
  and doors, so a plugin can take over a tile the map also marks.
- `promptFor(world, npc)`: the prompt over an NPC instead of "Talk".
- `talk(world, npc)`: return true to play the conversation yourself.
- `talked(world, npc, knot, reachedOwnKnot)`: a conversation ended.
  `reachedOwnKnot` says whether it reached the NPC's own knot, which is what earns a
  stamp.
- `stamped(world, place, complete)`: a stamp was earned; `complete` when it was the
  last.
- `bumpedEdge(world)`: the player walked into the edge of the map.
- `update(world, dt, time)`: every frame the world runs freely (no takeover, menu or
  dialogue).
- `menuItems(world)`: start menu items after the Passport, either an action or a page of
  lines.
- `debug(world)`: fields merged into `window.__kai` under `?debug`, for e2e tests.

## Map object types

A game or plugin adds its own kinds of map object with `defineMapObject` from
`@datagutt/kai/world/objects`. Keep the descriptor in a module without Phaser, because
the map builders and the build import it too:

```ts
import { defineMapObject } from "@datagutt/kai/world/objects";

export const arcadeObject = defineMapObject("arcade", {
  props: { game: "string" },
  placement: "fixture",
});
```

- `props` are the object's properties by kind: `string`, `number`, `bool`, `facing`,
  `tiles` (tile keys the map writer turns into gids), and `string?` or `number?` for
  optional ones. A property named `id` becomes the Tiled object's name.
- `placement` says how the object sits on the map, and the map checks follow it.
  `standing` stands on walkable tiles and takes them. `fixture` sits on something solid
  and is used from a walkable side. `overlay` covers anything and goes unchecked.
- `size` is a fixed footprint (`{ w: 2, h: 1 }` for a cat lying across two tiles), or
  `rect` for a rectangle each object sizes itself.

The descriptor then serves three places:

1. Map builders place objects with `c.add(arcadeObject.at(5, 4, { game: "blocks" }))`.
2. The game's maps module (`paths.maps` in `kai.json`) lists every descriptor its maps
   use in `MAP_OBJECTS`, beside `GENERATED_MAPS`. The build rejects a map object of a
   type it does not know.
3. The plugin places them: `objects: [arcadeObject.place((world, cabinet) => ...)]`,
   where `cabinet.game` is typed.

## The World

A `World` lives for one visit to one map. The player leaving the map ends it and the next
map brings a new one. Keep a plugin's state for one visit in `perWorld(make)`, which
forgets it with the World. Keep state that outlives maps in the closure of the plugin
factory, or in `world.progress.flags` if it must survive a reload (call `world.save()`
after changing it).

What a plugin can do through the World:

- Read the map: `map`, `outdoors`, `grid`, `layers`, `spawns`, `spots`, `areas`,
  `doors`, `arrival`, `daylight`.
- Add NPCs of its own with `addNpc(def, actor, { managed })`. A managed NPC is moved by
  its plugin; the world only makes it talkable. `removeNpc` and `npc(id)` go with it.
- Play dialogue with `playKnot(knot, npc, onEnd)`, with `npc` null for narration.
- Change progress with `achieve(id)` and `save()`.
- Move the player to another map or spot with `goTo(target)`.
- Take the frame with `takeOver(takeover)` for a cutscene, a cabinet or the credits.
  The world stops walking and talking until the takeover's `update` returns false.
  `syncNpcs` keeps map NPCs animating meanwhile; `music: "credits"` plays the credits
  track.
- Clean up with `onShutdown(fn)` when the player leaves the map.

`world.services` holds what lasts the whole game: `data` (the content as `GameData`),
`config`, `live`, `music`, `ghosts`, the clock (`hours`, `month`), `season`, `night` (a
story night: clear sky, 23:00, the aurora out on every map until a plugin ends it) and
`firstVisit`.

## Examples in the repository

- `kai-live/src/presence/plugin.ts`: an NPC who follows a Discord presence between maps,
  configured by `content/presence.json`. It uses `boot`, `externals`, `mapCreated`,
  `update`, `promptFor`, `talked`, `menuItems` and `debug`.
- `kai-live/src/github/plugin.ts`: map objects (`crops`, `books`, defined in
  `github/objects.ts`) drawn from live data.
- `apps/datagutt/game/plugins/ferryIntro.ts`: a first visit cutscene as a takeover.
- `apps/datagutt/game/plugins/finale.ts`: a story night that ends in the credits.
- `apps/datagutt/game/plugins/arcade.ts`: arcade cabinets as a usable tile and a
  takeover.
