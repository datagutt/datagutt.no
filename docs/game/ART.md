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
2. **Pick by eye from the contact sheets.** `pnpm world:catalog` (needs the art, takes
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
