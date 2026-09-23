# Handoff

Last updated: 2026-09-23 (session 1: design, planning, M0 to M2, M3 generator and the live generated town)

## Current state

- **M3 in progress.** The generator works end to end, and the overworld was approved
  ("looks good for now") and is now the live `town` map (M3.7). The greybox town is gone;
  the greybox house stays until its interior is built.
  - `pnpm world:gen` runs `world/gen/maps/*` → committed `world/maps/<id>.tmj`
    (keeps `manual_*` layers) + append-only `world/tile-ids.json`. With the art it also
    writes `world/tile-colors.json` (2×2 colour sketch per tile, for placeholder builds),
    `world/tilesets/world.png` (for Tiled) and, with `--render [--grid --objects
    --collision --scale=N]`, `world/out/<id>.png` (gitignored: LimeZu pixels).
    `pnpm world:check` (in CI) fails when committed maps are stale. `--prune` rebuilds
    the registry while no map has manual layers.
  - Layers: ground, ground2 (autotile transitions), decal (paving, flowers), below,
    above (drawn over characters), hidden `collision` (+ `manual_collision`, whose
    reserved "clear" tile unblocks). The game picks the tileset by name
    (`greybox` or `world`) and reads every object layer.
  - Art knowledge lives in `world/art/`: `sheets.ts` (sheet ids and recoloured
    `DERIVED` sheets, e.g. `villaRed` = datagutt's falu red house), `palette.ts`
    (terrain sets, cobble, plateau 9-slice with stairs, pier, fence, decals, crops),
    `prefabs.ts` (buildings with doors, trees, props). Landscape helpers in
    `world/gen/features.ts` (plateau, pier, forest, fence, meadow, building).
  - Prefabs can be stamped mirrored or rotated (`stamp(p, x, y, "flipX" | "flipY" |
    "rot90" | "rot180" | "rot270")`), written as Tiled gid flip bits that Phaser reads.
    Prefer a sheet's own pre-drawn orientations (lighting stays right); rotate only
    flat things. `rowLayers` puts individual prefab rows on chosen layers.
  - Light and shade (user request): lights are map objects (`type: "light"`, glow or
    window beam, colour, intensity, flicker) drawn by `game/fx/Lights.ts` as additive
    sprites over everything; shapes in `game/fx/lightShapes.ts` are shared with the
    review renderer. Presets in `world/art/lighting.ts` (GLOWS, windowLight). Soft
    shadows are tiles from a generated "fx" sheet (`world/gen/fx.ts`) on the `shade`
    layer, which the game multiplies (layer property `blend`). Tile-based glows were
    tried and dropped: overlapping glows cut each other up.
  - LimeZu Room Builder groups are not repeating patterns: floors use (1,1) as the plain
    tile with (1,0)/(0,1)/(0,0) as baked wall shadows; walls are left end / middle /
    right end. Mixing them caused seams and blotchy shadows (user spotted it).
  - Interior design rules from user review: each floor/room gets its own sprite set
    (walls, floor, furniture), furniture faces different ways (chairs face tables, sofas
    face the TV), and multi-part setups use joined sprites rather than repeated ones.
  - M3.8 started: datagutt's house has two floors (user request): `house` (living room,
    kitchen, scale model, stairs up) and `house-up` (Thomas at two desks, mini-fridge,
    bed, stairwell down), in `world/gen/maps/house.ts`. Rooms come from
    `world/gen/interior.ts` (Room Builder walls/floors/border), furniture from
    `world/art/furniture.ts`. The greybox pipeline is gone.
  - Boathouse studio done (`world/gen/maps/boathouse.ts`, map `boathouse`): water slip
    with a rowboat running in under the bottom wall, fishing gear, the Guac desk, and the
    set (green screen, mirrored softboxes, camera). Sunniva moved in; the town door is
    wired (`boathouse_door` spawn).
  - Library done (`world/gen/maps/library.ts`): teal walls, herringbone parquet,
    bookcases (`bookcase(kind, wood)`), end-on aisle shelves, reading tables, globe,
    lit featured shelf (for M3.11), Solveig behind a reception desk. Talking works
    across counters (Pokémon style): a blocked, empty tile ahead with an NPC behind it.
  - Kiosk done (`world/gen/maps/kiosk.ts`): checkered floor, butter walls, coolers and
    the "second fridge", bun rack, a counter across the room (display case, Kroneis
    freezer, till with tip jar) with Randi behind it. Counter talk reaches across up to
    two blocked tiles.
  - Post office done (`world/gen/maps/postOffice.ts`): Posten-red walls, noticeboard
    and red letter box (both named in Liv's dialogue), writing desk, parcels behind a
    service counter, Liv behind it.
  - **The smithy is now a gym** (user decision after a subagent's research: LimeZu has no
    forge/anvil art in any pack). Place id `gym`, NPC id `trainer` (still Tor, now a
    gym bro), map `gym` (`world/gen/maps/gym.ts`), dialogue `trainer.ink`, exterior
    prefab `logCabin`. One piece of gym kit per skill category; front desk = payments.
  - Farmhouse done (`world/gen/maps/farmhouse.ts`): Ola's home (he stays out in the
    field): gingham walls, pale planks, baking oven, table, his harvest ledger, crates.
  - Unused but useful: the games-room sheet (`gameRoom`, 14_Basement) has arcade
    cabinets for the v1.1 canvases-as-arcade-machines idea; the museum sheet has
    paintings, statues and pillars for the town hall.
  - Measuring sprites: scratchpad `sprites.mjs <sheet> col row w h [minPx]` prints
    pixel-exact connected sprites as tile rects; much faster than eyeballing crops.
  - Every building has a notice-board sign with its name and a line of flavour
    (user request). NPCs stand outside their buildings for now; M3.8 moves each one
    indoors as its interior is built (Arne stays on the pier, Ola in the field).
  - `world/gen/maps/overworld.ts` builds the 96×76 `town`. Spawns: `ferry` on the pier,
    `house_door` (18,40), `office_door` (72,37). `?debug&map=<id>` opens any map.
  - Doors are only wired (`building(..., { link })`) once the interior exists;
    `pnpm assets` fails on doors to unknown maps or spawns.
  - Piers use `campingDry`, a derived camping sheet with its baked-in water made
    transparent (dark bands become a soft shadow), so the animated sea shows under them.
  - Building choices: villas (7_Villas) for homes, falu red villa for datagutt, Victorian
    pieces (24_Additional_Houses) for town hall and library with a door tile added,
    white house = farmhouse, log cabin = gym, corrugated house = boathouse, modern
    house = office, LimeZu post office, two-storey cottage = kiosk, lattice tower = radio
    tower, pines/oaks from 11_Camping.

- Branch `game` created from `master` at `bc7041e`.
- Design settled in a grilling session; everything is recorded in DESIGN.md.
- Planning docs, session hooks and milestone issues #3 to #9 are in place (M0.1 to M0.4
  done). The `game` branch is pushed to origin.
- No game code yet. The live site on `master` is untouched.
- M0.5 done: private repo https://github.com/datagutt/datagutt-assets (branch `main`,
  local checkout `../datagutt-assets`). It holds the 16×16 LimeZu Exteriors, Interiors
  and UI art, character and portrait generator layers (with `.ase` sources), and the
  original licence files: about 30k files, 85 MB. Layout is in its README.md. The zips
  and generator tool builds stay local and gitignored.
- M2.11 done: START menu (Enter, gamepad Start, or the Menu button top-left): Passport,
  Journal, Settings (sound, reduced motion), Credits (includes the required LimeZu credit).
- M2.10 done: Fjord Passport. Finishing a conversation with a place's main NPC stamps it
  (banner, thunk sound, small shake unless reduced motion); Enter shows the passport.
  Session progress lives in a `Progress` object in the registry (`PROGRESS_KEY`) and the
  save is written from it.
- M2.9 done: all 11 NPCs have Ink scripts using the topics pattern; every NPC stands in
  the greybox town near their future building (`TOWN_NPCS` in `world/greybox/maps.ts`),
  so every piece of content is playable now. Names come from the roster.
- User facts for dialogue: Ola (the farmer) is a man; Norwegian names follow their real
  gender, so check before using pronouns. Thomas does **not** drink coffee; he drinks energy drinks
  (running joke, noted in `main.ink`).
- M2.8 approved by the user: 11 NPCs in `game/npcs.ts` (name, place, personality, voice) with sprite
  recipes in `game/assets/manifest.ts`. Portraits are derived from sprite layers unless a
  recipe sets `portrait` (or `false`). Voices moved from blips.ts into the roster.
- M2.7 done: `# link:` tags offer "Open …?" after a line; e2e confirms a real popup.
  Input now queues every direction press (`dirPresses`).
- M2.6 done: synthesised per-character dialogue blips through Phaser's Web Audio output
  (read lazily: Phaser swaps its AudioContext on unlock). The saved mute setting applies.
- M2.5 done: talking portraits for datagutt and the ferryman (portrait generator layers,
  same recolour as the sprite), `# nod` / `# shake` Ink tags.
- M2.4 done: wood-and-parchment dialogue box (nine-slice of `ui/frame.png`, cropped
  from LimeZu Modern UI style 1 at 58,129 28×29), name tab, punctuation pauses.
- NPC dialogue uses the **topics pattern** (see `main.ink`): once-only questions return
  to a `(topics)` hub, a sticky `+` choice ends. The user reported that the old one-shot
  choices hid content; never go back to that.
- M2.3 done: dialogue is Ink in `game/dialogue/ink/` (main.ink INCLUDEs one file per
  NPC). The build compiles it to `public/game/dialogue/main.json`, generates EXTERNAL
  declarations from `game/dialogue/externals.ts`, and fails on unknown literal ids or
  NPC knots. `DialogueRunner` plays knots; visit state is saved as `save.dialogue.main`.
  Map NPCs now have `name` and `dialogue` (knot) instead of `text`. Drafted knots:
  ferryman, datagutt (for the user to edit).
- M2.2 done: `lib/world-state.ts` → `<script id="world-state">` in `/` (prerendered,
  hourly) → `game/live/worldState.ts`. `?debug` logs the repo names. `lib/github.ts` uses
  `'use cache'`, logs failures as `[github] … failed`, and caches failures for minutes.
- M2.1 done: `content/` holds profile, socials, projects (slug ids), experience, skills
  and places (the full DESIGN §5 content map, with a test that every project and job has
  exactly one place). The legacy components read from it too.
- **M1 is complete** (greybox): walk the town and house with keyboard, gamepad or taps,
  talk to the ferryman and datagutt, read signs, use doors, reload to continue, and
  deep-link with `?at=dock|home|office`. `?debug` shows FPS and exposes
  `window.__fjord` (map, tile, facing, dialogueOpen, camera) for tests.
- Asset pipeline: `pnpm assets` = fetch + `scripts/assets/build.mjs` into `public/game/`.
  Character recipes live in `game/assets/manifest.ts` (datagutt: Body_02, Outfit_14_04,
  Hairstyle_20_01 recoloured yellow, Glasses_01 recoloured black). Greybox maps are code
  in `world/greybox/`. In-game text uses Geist Pixel converted to a bitmap font.
- CI: `.github/workflows/ci.yml` runs lint, tsc, unit tests, a placeholder build and e2e.
- M1.1 and M1.2 done: `/` is a server-rendered title screen (`components/game/TitleArt.tsx`
  SVG fjord scene, `GameShell.tsx` client host) that boots Phaser behind it; old page at
  `/legacy`; `/journal` is a stub. Game code in `game/` (boot, viewport, Boot/Preload/World
  scenes; World is still a test pattern).
- M0.6 to M0.10 done: `scripts/assets/fetch.mjs` (+ tested `source.mjs`), ignore rules
  for generated/licensed output, deps (phaser 4.2.1, inkjs 2.4.0, pngjs, vitest 5,
  Playwright 1.63, @types/node 24), ESLint boundary for `game/`, `pnpm test` and
  `pnpm test:e2e` (smoke test of `/` on desktop and phone). `pnpm lint` was broken
  (Next 16 removed `next lint`) and now runs the ESLint CLI.

## Next step

M3.8: the remaining interiors ( town hall + basement server
room; office; radio hut), moving each NPC indoors as its
interior lands and wiring its door with `building(..., { link })`. Then the rest
of M3.6 (reachability from the dock), seasons (M3.9), live library and farm (M3.11).
**M0.11 (Vercel token) stays deferred** until the user asks.

## Blockers and things waiting on the user

- LimeZu packs worth buying (research 2026-09-23): **Modern Farm** (barns, 19 crops,
  animals, tools; good for the farm and M3.11) and **Modern Office**. Office previews
  show cubicles, desktop PCs, laptops, printers, water coolers, a drinks vending
  machine, whiteboards with charts, filing cabinets, AC units and brick/tile/plank
  floors; no server racks are visible, so the server basement may still need a
  workaround.
- The user may buy LimeZu's **Modern Office** pack. The Nettbureau office interior and
  the town hall's basement server room wait for it (desks, computers, server racks);
  build the other interiors first. When it lands in datagutt-assets, add its sheets to
  `world/art/sheets.ts`.

- A fine-grained read-only token for that repo, stored in Vercel as `ASSETS_REPO_TOKEN`
  (M0.11).
- The user may edit dialogue drafts in `game/dialogue/ink/` at any time.

## Gotchas learned so far

- Survey sheets with the scratchpad tools (a labelled grid crop of a sheet, an ASCII
  occupancy dump); LimeZu packs sprites edge to edge, so bounding boxes by flood fill
  merge neighbours. Check every prefab in a render before trusting its door.
- A map cell holds one tile per layer: overlapping prefabs cut each other up. Trees are
  placed with non-overlapping footprints for that reason.
- Node's type stripping rejects TypeScript parameter properties
  (`constructor(readonly x)`) in files the build scripts import.

- Vercel cannot pull private git submodules, so the build clones the assets repo with a
  token instead (DESIGN §9).
- The Mana Seed licence forbids use alongside AI-generated code. Do not use it.
- `.gitignore` tracks only `.claude/settings.json` and `.claude/hooks/`; everything else in
  `.claude/` (such as `settings.local.json`) stays ignored.
- Writing tens of thousands of small files to `/mnt/c` from WSL is slow (the extraction
  took several minutes). Run such jobs in the background.
- The Modern Exteriors licence allows use "in open source projects", but Interiors and UI
  do not, so the public repo still never holds any LimeZu pixels.
- Next.js was upgraded from 16.2 canary to **16.3.6** (React 19.3, React Compiler 1.0).
  Turbopack's on-disk cache fails on `/mnt/c` (fsync EINVAL), which was also the cause of
  the earlier dev panic; `next.config.mjs` turns that cache off only on WSL-mounted
  drives. `experimental.viewTransition` no longer exists and was removed.
- `pnpm test:e2e` runs against `next start` (run `pnpm build` first), or set
  `E2E_BASE_URL=http://localhost:3100` to test against a running `pnpm dev`.
- Fast loop for game work: `pnpm game:dev` (esbuild harness, port 3200, live reload).
  Visual checks: a Playwright screenshot script, then view the PNG. Measure pixel runs
  with pngjs to prove crispness rather than eyeballing.
- pnpm does not run `pre*`/`post*` scripts; chain steps inside the script instead.
- `pkill -f <pattern>` (and `ps | grep <pattern>`) inside a Bash call matches that same
  shell's command line and kills it. Find processes by port instead:
  `ss -ltnp | awk '/:3100 /'`.
- `eslint-config-next` is still 15.2.2 because 16.x needs ESLint 9 flat config; migrate
  when convenient.
- LimeZu character sheets: 16×32 frames, 56 per row, directions right/up/left/down;
  rows 0 stand, 1 idle, 2 walk, 3 sleep, 4–5 sit, 6 phone. Some sheets are wider than
  896 px (Body_01 is 927), so the build crops. Some PNGs have trailing bytes that pngjs
  rejects; use sharp.
- Next allows only one `next dev` per project folder; if one is already running (for
  example the user's), point `E2E_BASE_URL` at it instead of starting another.
- `experimental.testProxy` in next.config broke every server fetch; it is gone. If server
  fetches fail with "other side closed", suspect config before the network.
- Anything non-deterministic (`new Date()`, `Math.random()`) must sit inside a
  `'use cache'` scope or behind `connection()`, or `/` fails to prerender.
- WorldScene.update() returns early while dialogue is open; anything that must run every
  frame (like the `?debug` readout) goes before that return.
- Phaser folds presses of the same key that land in one frame; tests that tap keys
  should wait ~60 ms between presses.
- Commit after each finished task, not in large batches (user preference).
- Phaser ships `docs/` and `skills/` inside `node_modules/phaser`. Read those for
  Phaser 4 APIs.
- `jq` is not installed on this machine; hook scripts use plain shell and node.
- The datagutt NPC must match `public/images/avatar.png` (blond hair, chunky black square
  glasses, stubble, light-blue top).
