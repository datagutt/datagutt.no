# Handoff

Last updated: 2026-09-23 (session 1: design through M5; the Nettbureau office on Modern Office)

## Current state

- **Title screen v2 (M5.11), approved by the user 2026-09-24.**
  - Backdrop (`components/game/TitleArt.tsx`): a summer day, drawn on a grid of game
    pixels. A wide screen sees 512×288 (18 tiles tall, like the game); a tall phone sees
    extra sky above, at about the game's phone zoom. Sky, sun, drifting clouds, gulls,
    snowy peaks, hills and the fjord's walls are SVG; the waterfront in front (pines,
    kiosk, hut, lamps, beach, pier, boats) is the game's own tiles, built by `pnpm assets`
    from `world/gen/title.ts` into `public/game/ui/title.png` (14 KB; nothing painted above
    the tree line). Placeholder builds skip that image and show the sky alone. Motion is
    CSS only and stops under reduced motion; the mouse gives parallax.
  - The daytime sky is on purpose: the tiles are lit by day and looked wrong under dusk.
  - Flow (`components/game/GameShell.tsx`): Press start (any key, click or tap), then a
    menu: Continue (with a save), New game, Credits, "Read it as a normal website". New
    game over a save asks first; `start({ fresh: true })` clears the save, keeps the
    settings, and plays the ferry intro without a reload (`PreloadScene.beginStory`).
  - The page is 42.6 KB gzipped. Next sends the SVG twice (HTML and RSC payload), so
    keep its paths compact.
  - No avatar on the title: the user's choice.
- **Nettbureau office (M3.8), waiting on the user's review.** LimeZu's Modern Office
  pack: 16×16 files in datagutt-assets `limezu/office/` (licence in
  `licenses/modern_office/`), sheets `workplace` (furniture singles, all 2×3 canvases,
  catalogued; `office` was taken by the exterior building) and `officeRooms` (room
  builder; wall and floor styles take a `sheet`). `world/gen/maps/office.ts` is one big
  open floor (42×29) for a company of about 60: Dev, Product and design, a kitchen,
  Customer service, reception (Ida) by the door, Growth and a lounge, departments marked
  by `floorPatch` carpets and a glass wall across the middle. Six coworkers with one
  random line each (`game/dialogue/ink/office.ink`, recipes in the manifest with
  `portrait: false`); they are not in the NPCS roster, so they give no stamp.
  Desks are built the way LimeZu's own office designs build them (`officeDesk`): a desk
  top cut from the sheet, a computer set laid over it, a chair seen from behind. The
  Modern Office singles 323 and 328 are printer desks, not computers (`printerDesk`).
  Of the four office chairs per colour in the sheet (rows 8 and 10), column 1 is the
  back view (a plain shell); columns 0, 2 and 3 face the viewer and look turned away
  from the desk. Every other seat in the game faces the right way (checked 2026-09-23).
  Side chairs pair with the 4-wide `table` at the table's own x and x + 3, as in the house.
  The user asked for a looser layout (pairs, rows out of step, bags on the floor), plus
  arcade machines and ping pong from the basement sheet in the lounge.
- **Town hall basement (M3.8), waiting on the user's review.** The plain door by the
  stage now leads down (map `town-hall-basement`, built in `townHall.ts`): the municipal
  IT department, not a server room. An escalator (the upstairs sheet's grey one, 3 wide
  so the player rides its middle column; the basement sheet's own stairs are 2 wide and
  would put the player half a tile off) with a sign about the IT budget. Racks and
  printers along the back wall (Modern Office's dark cabinets, `serverRack`), the
  helpdesk, and Fido the server in the corner. Bjørn moved down there. One e2e run of three had a single failure that did not
  come back; watch for a flaky test.
- **M5.9 performance pass, first half** (the real-phone measuring is the user's).
  - Payload for a first visit, gzipped: the game chunk (Phaser and the game) about
    417 KB, the world atlas about 290 KB, sprites about 100 KB, the town map 25 KB, plus
    Next's own JS. Around 1 MB, the target. A physics-free Phaser build (Phaser's
    `src/phaser-no-physics.js`) would save only about 35 KB and needs bundler defines;
    not done.
  - `scripts/assets/png.mjs` `shrinkPng`: indexed PNG when an image has 256 colours or
    fewer (checked pixel for pixel), else max-effort truecolour. Used for characters,
    portraits, the atlas and the emotes: 478 KB became 391 KB.
  - Effects setting (`settings.effects`: auto, high, low; Settings menu "Effects").
    `game/fx/quality.ts`: low skips the water and aurora shaders and thins the weather
    (no frost filter); auto watches frame times (`FrameWatch`: after 1.5 s, a 4 s
    window, under 45 fps is slow) and drops to low for the visit (`services.autoLow`).
    `window.__fjord.quality`.
- **M5.8 finale done.** The stamp that fills the passport shows its toast, then
  `finale_note` (a note from Thomas) and a fade to the town's `finale` spawn with
  `services.finale` on: the clock fixed at night, the aurora at full strength whatever
  the season, and Thomas held at the `datagutt-pier` spot (`LiveThomas` takes a fixed
  `Doing`, whose `dialogue` is `datagutt_finale`). Talking plays his goodbye, then
  `game/ui/CreditsRoll.ts` rolls `content/credits.ts` (also the START menu's Credits now;
  the portfolio's stack in `content/projects.ts` is the game's), then `datagutt_contact`
  ends on the email link. The save flag `finale` stops it replaying; the night lasts
  until the next map. `?debug&finale` starts there; e2e covers the whole chain from the
  last stamp.
- **M5.7 ferry intro done.** `game/scenes/Intro.ts`, on a first visit (no save, no deep
  link: `services.firstVisit`; `?debug&intro` forces it) arriving at the dock: the
  ferry's tiles (a new `area` map object, id `ferry`, from the generator) are lifted into
  a group of images using per-tile atlas frames, sail in from 14 tiles out with the
  player on deck, and go back into the map on docking; the player hops onto the pier and
  Arne plays `ferryman_intro` (passport, controls, Journal). Any key, button or tap skips
  the crossing. The save flag `intro` stops it replaying; Arne's usual greeting knows the
  intro happened. `window.__fjord.intro`; e2e covers first and returning visits.
- **M5.6 audio done** (sounds synthesised, the user's choice; recordings may replace
  layers later). `game/audio/Ambience.ts`: one per game (registry `ambience`), buses
  master (into Phaser's output, so mute holds), ambience, effects, music. Layers: waves
  (swelling brown-ish noise), wind (drifting band of noise), gulls and birdsong (scheduled
  calls), fire (roar plus crackles), room hum; each glides (1.2 s) to the level
  `game/audio/mix.ts` asks for from distances to open water, forest and fire (distance
  fields, `game/world/distance.ts`), indoors or out, darkness and season. The generator
  marks forest cells in a hidden `forest` layer. Effects and blips now go through the
  effects bus (`ambience.effects`). `window.__fjord.ambience`. CREDITS.md lists sources.
- **M5.3 aurora built** (waiting on a real-phone fps check; the user approved day and
  night, M5.1). The camera looks straight down, so `game/fx/Aurora.ts` shows what you'd
  glimpse overhead: a screen-space additive shader, a curtain hanging from the top of the
  screen with a swaying hem and drifting rays, violet to teal to the site green, in 8
  flat steps. Strength follows darkness (from 60% dark) times the season (winter 1,
  autumn 0.7, spring 0.45, summer 0); `update(dark, boost)` takes a boost for the
  finale. The fjord's ripples turn green with it. The winter frost rim fades at night
  (it glowed). First try covered half the screen in speckled noise; keep it high and flat.
- **M5.2 water shader built** (waiting on the user's look by day and night).
  `game/fx/Water.ts`: one Phaser `Shader` quad over the map with drifting ripple lines
  in the sky's colour and sparse glints, whole pixels only. The generator writes a hidden
  `water` layer (collision tile = open water, clear tile = sea under a pier or boat);
  the game turns it into a 1 px per tile mask texture. Shore tiles are skipped: their
  LimeZu art already holds the beach and its foam, and a tile-edge foam band landed on
  the sand. No WebGL, no shader. Gotchas: a Phaser canvas texture is sampled upside down
  in a Shader (flip the row), and `ShaderQuadConfig` needs a `name`.
- **M5.5 game feel built** (waiting on the user's hand review with reduced motion on and
  off). `game/fx/Feel.ts`: dust puffs at the heels on each step, a 2 px lean and a low
  thud (`playBump`) on bumping into things, a squash on stepping through a door, a camera
  shake on a new stamp, and a camera that eases after the player (lerp 0.14) and looks a
  little ahead while walking. Reduced motion: no shake, no look-ahead, one puff. Actors
  now have their origin at the middle of their feet (`Actor.centerX`), so the squash
  keeps them standing.
- **M5.4 season effects done.** `game/fx/Weather.ts`, outdoors only: snow and a pale
  frost vignette (a camera filter) in winter, pink petals in spring, drifting pollen in
  summer, tumbling leaves in autumn; tiny baked pixel sprites, screen-space emitters under
  the time-of-day tint, thinned out and not spinning with reduced motion. June nights stay
  light (`daylightAt(hours, month)`: a third as dark, paler tint); `services.month`,
  `?debug&month=`.
- **M5.10 interaction prompts done.** `game/ui/Prompt.ts` shows "E Talk", "A Enter",
  "Tap Read" (or "Wake" for Thomas asleep) over whatever interact would use
  (`WorldScene.targetAhead`, counters included). The button follows the last input used
  (`FrameInput.device`: keyboard and mouse show E, gamepad A, touch "Tap"). Interact on a
  door now walks through it. Thomas's bubbles step aside while the prompt is on him
  (`LiveThomas.quiet`). `window.__fjord.prompt`. In e2e, a quick key press doesn't turn
  the player (press and release land in one frame); hold it about 60 ms.
- **M5 started: M5.1 time of day done.** `game/world/dayNight.ts` maps the visitor's
  clock to a multiplied tint and a darkness (dawn 6:30 pink, day, dusk 19:00 rose, night
  from 20:30 blue; keyframes blend); `?debug&time=dawn|day|dusk|night|HH:MM` fixes it
  (`services.hours`). `game/fx/DayNight.ts` puts the tint over outdoor maps (map
  property `outdoor`, written by the generator) just below the lights, so lights add on
  top and glow. Lights have an optional `when`: "day" (window beams, `windowLight`) fade
  at night, "night" (`NIGHT_LIGHTS.streetLamp` on every lamp head, `NIGHT_LIGHTS.porch`
  over every building's front door via `building()`) come on after dark. Review renders
  show day. `window.__fjord.daylight`. An orange dusk turned the fjord green, hence rose.
- **M4.6 cleanup done: M4 is complete except M4.4's real-phone check.** The reactions
  overlay (`components/reactions`, `hooks/useReactionsSocket.ts`, `lib/reactions`,
  `/api/reactions/ws`, the `rx-*` CSS), the Lanyard card and `react-use-lanyard` are
  gone; `/legacy` keeps its other sections. `lib/lanyard.ts` only resolves the Discord id.
  CLAUDE.md's "Live systems (game)" section replaces the old card and overlay notes.
  - A stale `.next/dev/types` from an old `next dev` run can still import the deleted
    route and fail `pnpm build`'s type check; delete that folder (it is generated).
  - Thomas no longer points at the model on the table in "What are you working on?"
    (he can be anywhere now), and the model by the door is a scale model of the house,
    not the town (user).
- **M4.5 emotes done.** Holding interact for 0.4 s (keys or pad A; a press still
  interacts at once) or a long press on the player opens `game/ui/EmoteWheel.ts`, a ring
  of `GHOST_EMOTES` around the head: arrows move round it, interact picks, back or a tap
  elsewhere cancels. The pick shows over the player for 3 s and goes to the room, where
  the ghost layer shows it over that visitor. `InputController` gained `interactHeld` and
  `longPresses`. Settings has "Other visitors: On/Off" (`showVisitors`, already in the
  save), which starts or stops the socket (`WorldScene.applyVisitors`); with
  `localStorage.rx_off = "1"` there is no client at all. `window.__fjord.emoteWheel`.
- **M4.3 ghost protocol done, M4.4 ghost rendering built** (waiting on a real-phone
  check). Protocol in `game/net/protocol.ts` (join/move/emote/leave in, welcome/room/
  joined/moved/emoted/left out, parsed and bounded both ways). Rooms per map in
  `lib/world/rooms.ts`: random "Traveller from <town>" name and tint per connection, a
  token bucket per connection (moves 1, joins 2, emotes 3; 20 tokens, 10 a second), no
  echo to the sender, single-instance fan-out (DESIGN §14). The Vercel route
  `app/api/world/ws/route.ts` is a thin adapter; `experimental_upgradeWebSocket` only works
  on Vercel's runtime, so `next start` and the e2e tests have no ghosts. For local work
  the dev harness (`scripts/game-dev.mjs`) now puts a small proxy in front of esbuild's
  server that also answers the socket (`scripts/world-socket.mjs`, tested over real
  sockets), so two tabs of `pnpm game:dev` see each other.
  - Client: `game/net/ghosts.ts` (`GhostClient`: join on entering a map, move on each
    step or turn, rejoin after reconnect; off with `localStorage.rx_off = "1"`), built
    on `game/net/reconnect.ts`, which the Lanyard client now shares.
    `game/entities/Ghosts.ts` draws them: the player sprite tinted and at 60% alpha,
    walking tile to tile (snapping when more than 3 behind), nearest 20 only, fading out
    after 30 s still, name on hover or a long press, emote bubbles ready for M4.5.
    `?debug&ghosts=20` adds wandering fake ghosts for performance checks;
    `window.__fjord.ghosts` counts them.
- **M4.2 live datagutt NPC done.** `game/live/datagutt.ts` maps presence to a place
  (`doingFor`, the user's rules in DESIGN's open-questions table), what he says about it
  in dialogue (`nowDoing`, bound to the `lanyard_activity()` external) and the START
  menu's "datagutt's status" screen (`statusLines`). Places are `spot` map objects named
  `datagutt-<place>` (desk and bed in `house-up`, fjord and square in `town`), placed by
  the generator; a test checks they exist and that doors link house-up, house and town.
  `game/entities/LiveThomas.ts` puts him on the current map and walks him when his
  presence changes while the player watches: to the new spot, out through the door
  toward another map, or in through the door he comes from (a small map-link table in
  datagutt.ts, since only he travels). He wanders the square, lies in bed with LimeZu's
  sleep frames (the head drawn on the pillow, `PILLOW` offset), and shows emote bubbles
  from LimeZu's thinking-emotes sheet (`game/ui/emotes.ts`, built to `ui/emotes.png`) or
  his custom status as a speech bubble when the player is within 7 tiles
  (`game/ui/Bubbles.ts`). Asleep, talking plays `datagutt_asleep`: "Wake him up?" leads
  into his usual knot. The passport stamp now needs the NPC's own knot visited during the
  talk (`DialogueRunner.visits`), so "Let him sleep" doesn't stamp. New Ink tag
  `# narration` (no portrait or name).
  - Debug and e2e: `?debug&presence=offline|coding|gaming|music|idle|online` fixes his
    presence instead of Lanyard; `window.__fjordPresence(name)` switches it live;
    `window.__fjord.thomas` has his place, tile and whether he is asleep. e2e tests pin
    `presence=coding` for anything that talks to him.
  - Upstairs stairwell: the railing frame's bottom bar straddles two sheet rows, so the
    rail prefab stops a row early and bare side posts continue it (user spotted a bar
    across the stairs).
- **M4 started: M4.1 Lanyard client done.** `game/net/lanyard.ts`: `LanyardClient`
  (hello, subscribe, heartbeat, reconnect with backoff from 1 s to 60 s), `parsePresence`
  (status, custom status text, Spotify song, other activities), and `PresenceFeed`, which
  holds the latest presence for anything that subscribes. `bootGame` starts it as
  `services.presence`; `?debug` logs each update and shows it in `window.__fjord.presence`.
  The Discord id lives in `content/profile.ts` (`discordId`), goes through WorldState
  (`lib/world-state.ts`, `NEXT_PUBLIC_DISCORD_ID` still overrides), and falls back to the
  profile's id in the dev harness. Checked live: presence arrives in the game.
  - Custom status keeps only the text: Thomas's status is often just a custom Discord
    emoji, which is a bare name ("catLove"), and the bitmap font has no emoji anyway.
- **M3.10 characters done.** Every NPC has a walk sheet and a portrait with a look that
  fits their job (recipes and one-line looks in `game/assets/manifest.ts`). Compositing
  moved from `scripts/assets/build.mjs` to `scripts/assets/characters.mjs`.
  `pnpm characters:review` writes `world/out/characters.png` straight from the recipes
  (1x on grass and 4x, all four directions plus the portrait), no `pnpm assets` needed.
  A layer can name its own portrait counterpart (`{ file, portrait }`), used for the
  `_Small` hats that fit portrait heads (Arne's beanie, Ola's cap).
  - User decision: datagutt keeps the original look (stock Glasses_01 recoloured black,
    no stubble). Build-time thickened glasses and a skin-toned stubble beard were tried
    and dropped.
  - LimeZu has no straw hat that leaves the eyes visible in the portrait (the
    "Detective" hat covers them), no headphones, no tank top and no hard hat.

- **M3.9 seasons done** (docs/game/ART.md, "Seasons"). The generator writes a swap
  table per season into outdoor maps (`season:<name>` map properties; only `town` is
  outdoor) and `WorldScene` applies it to a cached copy of the map
  (`game/world/season.ts`: `seasonOn` uses Europe/Oslo, `?debug&season=` overrides).
  Seasonal tiles are `<sheet>@<season>` keys recoloured in `SheetCache` from rules in
  `world/art/seasons.ts`: autumn uses the camping sheet's real autumn trees (+26 rows;
  oak, round tree and pineMid as larch), olive grass, orange bushes; spring freshens
  greens and turns grass patches into flowers; winter has flat ground snow, snowy
  foliage highlights, no flowers, and automatic shaded snow caps along roof tops
  (`paintSnowCaps`, roof colours in `ROOFS`). Hand-drawn PNGs in datagutt-assets
  `seasons/<season>/` override everything (`SheetCache.applyOverrides`).
  - User feedback that shaped it: recolouring whole roofs white didn't work (lost
    texture, speckles, walls in roof colours got snow) and plain white needs shades.
    Hence caps + shaded hand-cleaned drafts instead of recoloured roofs.
  - Furniture shadows: `shadowUnder()` (see Light and shade below).

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
    tried and dropped: overlapping glows cut each other up. Furniture shadows use
    `shadowUnder(c, prefab, x, y, highBase?)`: an oval around the object's base on the
    `shade` layer, which now draws *under* `below` so it only peeks out around the feet
    (blobs a row below made sofas and tables look like they floated; user spotted it).
    Pass `highBase` for art that ends halfway down its last row (tables, counters, bed).
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
  - Town hall done (`world/gen/maps/townHall.ts`, map `town-hall`): burgundy walls,
    marble, stage and lectern between pillars, portraits, pews (museum benches mirrored
    top to bottom so they face the stage), a red carpet. Bjørn waits by the locked,
    humming basement door; his first line now says "nobody comes looking for the
    basement". The basement server room is still to build (needs rack art).
  - Radio hut done (`world/gen/maps/radioHut.ts`, map `radio-hut`, door on the hill):
    Kjell's control room: transceivers, a transmitter, signal screens, a retro PC,
    blinking status lights (flickering glows). Kjell moved in from the tower.
  - Farmhouse done (`world/gen/maps/farmhouse.ts`): Ola's home (he stays out in the
    field): gingham walls, pale planks, baking oven, table, his harvest ledger, crates.
  - Unused but useful: the games-room sheet (`gameRoom`, 14_Basement) has arcade
    cabinets for the v1.1 canvases-as-arcade-machines idea; the museum sheet has
    paintings, statues and pillars for the town hall.
  - **Space and collision** (user: rooms felt too tight): prefabs block only tiles their
    art covers (catalogue `coverage`, "#" = at least a quarter filled); `single(...,
    { base: n })` lets tall standing things block only their bottom rows. The validator
    checks everything is reachable from the entrance/ferry and that signs sit on solid
    things. Rooms are 16 wide with two-tile aisles; the house stairs were unreachable
    before this. Doors must sit on the door art (the office's and gym's were a column off).
  - Overlaps: prefab tiles **stack** (`MapCanvas.stack`): where objects overlap, the
    atlas gets a composite tile ("a|b~flip" registry keys) instead of one replacing the
    other. Stamping order is drawing order (stamp chairs before their table).
    Modular LimeZu objects are assembled with `assemble(parts)` (the side sofas: backrest
    top, seat, end; the sheet stores those parts out of order).
  - Coverage counts only near-opaque pixels (alpha >= 200), so baked drop shadows don't
    block (user hit an invisible wall along the farmhouse's shadow).
  - User ideas queued in PLAN.md: M3.12 closed doors read as closed, M5.10 interaction
    prompts, M5.11 title screen v2.
  - **Art handling rules are in docs/game/ART.md** (user found half-cut sprites): use
    LimeZu singles via `single(sheet, key)`, pick them from the contact sheets that
    `pnpm world:catalog` writes, and `world:gen` fails on prefabs that cut an object.
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
- Dialogue can be re-asked (user idea): once every question is used, "Can I ask you
  something again?" opens an `again` menu of all questions; answers are `answer_n`
  tunnel stitches. Follow that shape when writing new NPCs (main.ink explains it).
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

M4 is done apart from ticking M4.4, which needs the user to see `?debug&ghosts=20` run
smoothly on a real phone (`pnpm game:dev`, open it on the phone over the LAN). Next is
M5 (atmosphere and polish; M5.10 interaction prompts and M5.11 title screen v2 are the
user's own ideas). Still open in M3: the user's review of the Nettbureau office and the
town hall basement IT department. The e2e passport
test picks the goodbye once "ask again" appears; keep that in mind when changing dialogue
flow. **M0.11 (Vercel token) stays deferred** until the user asks, and ghosts can only be
tried on a Vercel deployment or with `pnpm game:dev`.

## Blockers and things waiting on the user

- **Snow roof drafts in datagutt-assets `seasons/winter/`** (user's choice: drafted by
  `pnpm world:snow`, committed as they are, the user may clean them up in Aseprite
  later). Review sheet: `world/out/snow-drafts.png`. Roofs the sky scan misses and walls
  in roof colours are fixed per sheet or single with ordered "roof"/"cut" polygons in
  `SNOW_EDITS` (`world/gen/snowDraft.ts`); every building in town has them where needed.
  Once a file is hand-edited, never `--force` over it; commit edits in datagutt-assets
  and run `pnpm world:gen`. Once cleaned, commit
  in datagutt-assets and run `pnpm world:gen`. Never `--force` over cleaned files.

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

- Dialogue choices wrap onto several lines when long (`wrapChoices` in
  `game/ui/text.ts`); the cursor and taps go by choice, not by line. The user caught
  "Is there a quicker way to see everything?" running outside the box on a narrow window.

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
- The datagutt NPC is based on `public/images/avatar.png` (blond hair, black glasses,
  light-blue top). The user prefers the stock glasses recoloured black over thicker
  hand-edited ones.
