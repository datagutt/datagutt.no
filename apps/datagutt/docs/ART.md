# Using LimeZu art without cutting sprites in half

LimeZu sheets are not grids of whole objects. Many objects sit off the tile grid
(the kitchen's left-facing chairs sit 4 px right), some sheets borrow objects from other
themes (the living room's sofas are basement art), and some objects exist only as
**singles**: finished objects LimeZu assembled from parts that lie separately in the
sheet (329 of the camping sheet's 693 singles, 313 of the bedroom's). A rectangle
measured by eye from a sheet will sooner or later drop a table's legs or a rug's border.
So:

1. **Prefer singles.** Every exterior theme and every interior theme except `generic`
   and `upstairs` has a Singles folder (`SINGLES` in `world/art/sheets.ts`). Use
   `single(sheet, key)` from `world/art/singles.ts`: the key is the single's number
   (`single("kitchen", 368)`) or, for exterior singles, its name
   (`single("vehicles", "Boat_3_Right_1")`). Recoloured sheets work too
   (`single("villaRed", "Villa_5")`). The atlas packs the single's own image, so it is
   always whole.
2. **Pick by eye from the contact sheets.** `bun run world:catalog` (needs the art, takes
   ~10 minutes) writes `world/art/catalog/<sheet>.json` (committed; positions and sizes
   only, no pixels) and, in `world/out/catalog/`, `<sheet>-singles.png` (every single,
   numbered) and `<sheet>.png` (the sheet with objects boxed). Rerun it when the art
   changes or a sheet is added.
3. **Cutting from a sheet is checked.** `world:gen` and `world:check` fail when a prefab
   cut from a sheet with singles overlaps an object without containing all of it
   (`world/gen/cuts.ts`), and suggest the single to use instead. A deliberate crop needs
   `allowCut: "<why>"` on the prefab.
4. **Sheets without singles (`generic`, `upstairs`) are checked by eye.** Their catalogue
   is detected from pixels, which merges objects that touch, so the cut check skips them.
   The generic sheet's rugs are modular pieces (corners, edges, runners), not whole rugs:
   `(3,22) 2×2` is a complete small red one.
5. **Modular pieces are fine when whole.** Some furniture is built from pieces on purpose
   (sofas from arm and seat parts, counters from segments); a rectangle that contains
   every piece passes the check.
6. **Which single is this?** `node scripts/world/find-single.mjs <prefab>` searches every
   singles folder for the images inside a prefab's rectangle.
7. **Room Builder floors and walls are not repeating patterns** (see `interior.ts`):
   floor groups have one plain tile and baked wall shadows; walls have end pieces.
8. **Collision follows the art.** Without an explicit `collision`, a prefab blocks only
   tiles its art fills at least a quarter of (the catalogue's coverage). Tall things that
   stand on the floor take `base: n` so only their bottom rows block and the rest draws
   over characters walking behind. Leave two-tile aisles; the validator fails if anything
   can't be reached from the entrance.
9. **Put doors on the door art.** Check a building's door in a render with `--objects`;
   several LimeZu buildings have their door off-centre, or two doors.


# Seasons

The town changes with the Norwegian calendar (December to February is winter, and so on).
The generator draws the town in summer; for each other season it writes a swap table
into the map (`season:winter` and friends, tile id to seasonal tile id) and the game
applies it when the map loads. `?debug&season=winter` picks a season, and
`bun run world:render --only=town --season=winter` renders one.

Where the seasonal tiles come from, in `@datagutt/kai-limezu` (`seasons.ts`):

1. **LimeZu's own seasonal art** where it exists: the camping sheet's autumn trees sit
   26 rows under the green ones. The leafy trees and one of the three conifers turn
   (as larch); the rest of the forest stays evergreen.
2. **Recolouring** for vegetation: a seasonal tile is `<sheet>@<season>:<col>,<row>`,
   the summer tile with its greens shifted (olive grass and orange bushes in autumn,
   fresher greens in spring, even snow on the ground and on the lit side of leaves in
   winter). Spring turns grass patches into flowers; winter clears the flowers.
3. **Snow caps** on roofs in winter, drawn automatically: a few pixels of shaded snow
   where the sky first meets each roof (`paintSnowCaps`). Roof colours per building
   are listed in `ROOFS`. Walls often share them, which is why only the top edge is
   automatic.
4. **Hand-drawn overrides** win over all of it: PNGs in datagutt-assets
   `games/datagutt/seasons/<season>/`. `<single>.png` (for example
   `villas#Villa_1.png`) replaces a single; `<sheet>@<col>,<row>.png` is pasted over a
   sheet with its top-left corner at that tile (for buildings cut from a sheet, like `houses@16,250.png`, the boathouse).

Full snow roofs are overrides. `bun run world:snow` drafts one per building into
datagutt-assets `games/datagutt/seasons/winter/` (shaded snow over the whole roof, known
walls cut out in `@datagutt/kai-limezu/snowDraft`) and writes `world/out/snow-drafts.png`
to review them. It
never overwrites a file that exists, since it may be hand-edited; `--force` redrafts
(and `--only=<prefab>` limits it to one building). Clean the drafts up in Aseprite,
commit them in datagutt-assets, then run `bun run world:gen` to rebuild the atlas.


# Animations

LimeZu's animated strips live under `limezu/exteriors/Animated_16x16/` and
`limezu/interiors/animated/`. Use the PNGs: the GIFs lose their pale transparent colours.
Each strip is one row of frames.

To animate something a map already draws:

1. Find its strip and the frame size (the static art's size, usually). Check that frame
   0 lies over the static art: most do at offset (0, 0), some sit a few pixels off (the
   treadmill 2 px higher, the windmill's blades 21 px down).
2. Add the strip to `kai.json` `sprites` (file, frame size, frame count, frame rate).
3. In the map builder, `c.reserve(prefab, x, y)` keeps its collision without its tiles,
   and `spriteObject.at(x, y, { sprite, dx, dy })` plays the strip there.

Sprites draw among the characters by their bottom edge. `layer: "below"` puts them
under everyone, for what the player stands on (the ferry's deck, the escalator), and
`layer: "above"` over everyone, like roofs (the windmill's blades over its tower).

Sprites don't change with the seasons the way tiles do: a strip has no snow. Keep the
parts winter touches as tiles and animate the rest, as the windmill does (a tower of
tiles with snow on its roof, sprite blades). `seasons` and `when` limit a sprite to
some seasons or to day or night: butterflies in spring and summer, birds by day. Renders
(`bun run world:render`) draw each sprite's first frame, for the season rendered.

Animals are `critters` in `kai.json`: a species names its strips facing left and right
(sitting, moving, taking off) and how it gets away when the player comes within two and
a half tiles. Crows `fly` off out of sight (LimeZu's gulls and pigeons have no flying
frames, which is why the square has crows), gulls `waddle` a few walkable tiles, and
butterflies `drift`. Each comes back to its spot once the player is seven tiles off and
ten seconds have passed. They block nothing, since they never stay to be walked into.

# Characters

NPC walk sheets and portraits are stacked from the LimeZu character and portrait
generator layers in datagutt-assets, per recipe in `game/assets/manifest.ts`
(`scripts/assets/characters.mjs` does the stacking). A recipe lists body, eyes, outfit,
hair and accessories in that order; the portrait is derived from the same layers because
the two generators share numbering.

- `bun run characters:review` writes `world/out/characters.png`: every character facing
  all four ways plus its portrait, at 1x on grass and at 4x. Judge looks at 1x.
- Natural skin tones are Body_01 to 04 and 07 (05, 06, 08 and 09 are yellow, grey, pink
  and blue). Hair colours 1 to 7 are ginger, light brown, auburn, dark brown, grey,
  dark grey and near black; styles 27 to 29 come in bright colours instead.
- Big hats cover the eyes in the portrait. Where a `_Small` portrait variant exists,
  name it on the layer: `{ file: "Accessories/Accessory_11_Beanie_01.png", portrait:
  "Accessories/PG_Accessory_11_Beanie_Small_1.png" }`.
- `recolor` on a recipe swaps exact colours in every layer (datagutt's yellow hair and
  black glasses).
