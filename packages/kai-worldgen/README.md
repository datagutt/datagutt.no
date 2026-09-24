# @datagutt/kai-worldgen

The map toolkit, with no art of its own. A game's map builders use it to lay out maps in
code, and `kai world gen` writes the result as Tiled `.tmj` files.

- `canvas`: `MapCanvas`, layers of tile references plus map objects, and prefabs.
- `autotile`, `layout`, `random`: terrain edges, paths and placement, seeded.
- `registry`, `tmj`: tile ids stable across builds, and the `.tmj` writer with seasonal
  tile swaps.
- `validate`, `render`: checks on a generated map, and PNG renders for review.
- `atlas`: the tile atlas packer. Art reaches it through a `SheetSource`, which an art
  adapter such as `@datagutt/kai-limezu` provides.

Build time only: nothing in a game's runtime may import it.

**Must not import:** any app, or an art adapter.
