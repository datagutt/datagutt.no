# @datagutt/kai-arcade

Small games for arcade cabinets, drawn on a canvas at a fixed screen size, and the
screen that runs one over the world.

- `.`: the games and `BUILTIN_GAMES`, a registry of them by id that a game extends
  with its own.
- `./object`: `arcadeObject`, the cabinet map object type. It has no Phaser, so map
  builders and the build can import it; list it in the game's `MAP_OBJECTS`.
- `./screen`: `ArcadeScreen`, a cabinet up close with keyboard, pad and touch input. A
  game's plugin shows it as a takeover (Fjord Town's is `apps/datagutt/game/plugins/arcade.ts`).

A map's `arcade` object names its game by id. Check the ids against the game's registry
in a unit test, as Fjord Town's `world/gen/maps/maps.test.ts` does.

**Must not import:** any app, the build time packages, Next or React.
