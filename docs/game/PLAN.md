# Fjord Town: implementation plan

This file is the **single source of truth for task progress**. Tick a box in the same
commit as the work that completes it. The GitHub issues (one per milestone) only hold the
goal and discussion; they link here and close when the milestone's exit criteria pass.

Decisions live in [DESIGN.md](./DESIGN.md). Session state lives in
[HANDOFF.md](./HANDOFF.md). Workflow rules are in [README.md](./README.md).

Task format: `- [x] **M1.3** Title: what to do. *Done when* the observable check.`
Tasks are ordered by dependency within a milestone. Milestones can overlap once their
dependencies are done (see the graph).

```
M0 Foundations ─┬─> M1 Engine core ─┬─> M3 World ──┬─> M5 Atmosphere ─┐
                └─> M2 Content ─────┴─> M4 Live ───┴───────────────────┴─> M6 Journal & launch
```

---

## M0: Foundations and tooling

Goal: repo, assets and toolchain ready so game code can start.
Issue: see README.md (issue links table).

- [x] **M0.1** Create the `game` branch. *Done when* the branch exists.
- [x] **M0.2** Write DESIGN, PLAN, HANDOFF and README under `docs/game/`. *Done when*
      committed.
- [x] **M0.3** Session continuity: SessionStart hook injects HANDOFF and open tasks; Stop
      hook blocks when code commits are newer than the last HANDOFF commit. *Done when*
      both hooks are in `.claude/settings.json` and pipe-tested.
- [x] **M0.4** GitHub issues, one per milestone, labelled `game`. *Done when* the issue
      links table in README.md is filled in.
- [x] **M0.5** Private assets repo. In `../datagutt-assets`: extract the 16×16 folders
      from the Exteriors, Interiors and UI zips plus the character and portrait generator
      layer PNGs into `limezu/{exteriors,interiors,ui,characters,portraits}/`; add
      `LICENSES.md` quoting each pack's licence; `git init`; create the private GitHub
      repo `datagutt/datagutt-assets` and push. Zips, `.exe` and 32/48 px copies stay
      out (`.gitignore`). *Done when* the private repo exists and a clone is under 300 MB.
      **Needs the user** to approve creating the GitHub repo.
- [x] **M0.6** Asset fetch step `scripts/assets/fetch.mjs`: use `ASSETS_DIR` if set
      (default `../datagutt-assets`); else if `ASSETS_REPO_TOKEN` is set, shallow-clone
      the private repo into `.assets-cache/`; else placeholder mode with a clear log
      line. *Done when* all three paths are tested locally.
- [x] **M0.7** Gitignore licensed output: `public/game/`, `.assets-cache/`,
      `game/generated/`. (The `.claude/` rules were already fixed in M0.3.) *Done when*
      `git status` is clean after a full asset build.
- [x] **M0.8** Dependencies: `phaser@^4`, `inkjs`, a texture packer
      (`free-tex-packer-core` or own maxrects), `pngjs` or `sharp` for compositing,
      `vitest`, `@playwright/test`. Verify Phaser 4 API docs from `node_modules` rather
      than memory. *Done when* `pnpm build` passes with the new deps. (Done with phaser,
      inkjs, pngjs, vitest, Playwright; the packer choice moved to M1.3.)
- [x] **M0.9** Boundary rule: ESLint `no-restricted-imports` so `game/**` cannot import
      `next`, `react` or `@/app`, `@/components`. *Done when* a deliberate bad import
      fails `pnpm lint`.
- [x] **M0.10** Test setup: `pnpm test` (vitest) for pure logic and `pnpm test:e2e`
      (Playwright) for smoke tests of `/` and `/journal`. *Done when* one trivial test of
      each kind passes.
- [ ] **M0.11** Vercel: add `ASSETS_REPO_TOKEN` (fine-grained, read-only, single repo)
      for Preview and Production. (`pnpm build` already runs the fetch step first; pnpm
      skips `pre*` scripts, so it is chained in `build`. Add the pipeline in M1.3.)
      **Needs the user** to create the token. *Done when* a preview deployment of `game`
      builds with real art.

## M1: Engine core (greybox)

Goal: walk around a greybox town, enter a building, talk to a stub NPC, on desktop and
phone.

- [x] **M1.1** Next.js shell: `app/page.tsx` renders the HTML title screen (static,
      under 50 KB) and a client-only `GameMount` that dynamically imports `game/boot.ts`.
      The old page moves to `app/_legacy/` until M6 so it can be compared. *Done when*
      `/` shows the title and Start boots Phaser. (Old page lives at `/legacy`, a routable
      folder rather than `_legacy`, so it can be compared; `/journal` is a stub.)
- [x] **M1.2** Phaser config: WebGL, `pixelArt: true`, `roundPixels`, integer zoom so the
      short axis shows at least 11 tiles, resize handling, DPR-aware. Scenes: `Boot`,
      `Preload`, `World`, `UI` (overlay), `Cutscene`. *Done when* the canvas is crisp at
      1×, 2× and 3× DPR with no subpixel shimmer while the camera moves. (Verified by
      screenshot analysis at DPR 1, 3 and 2.625: 3 colours only, 1-px dots exactly `zoom`
      device pixels. `UI` and `Cutscene` scenes get added with their features.)
- [x] **M1.3** Asset pipeline v1 `scripts/assets/build.mjs`: read the manifest
      `game/assets.manifest.ts` (which sprites and tiles are used), pack atlases into
      `public/game/atlas/*.png|json`, emit a typed key list `game/generated/keys.ts`.
      Placeholder mode emits coloured rectangles with the same keys. *Done when* both
      modes produce loadable atlases. (Done as per-kind sheets rather than packed atlases,
      with ids typed from `game/assets/manifest.ts` instead of generated keys; packing
      moves to the M5.9 perf pass.)
- [x] **M1.4** Tiled loader: load `.tmj` maps, tile layers, object layers (`door`, `npc`,
      `sign`, `stamp`, `spawn`, `trigger`), collision from a `collision` layer and tile
      properties. *Done when* a hand-made test map renders with collision.
- [x] **M1.5** Grid movement: 4-direction, tile-locked, walk and run speeds, facing, input
      buffering so turning feels tight (Celeste standard: no dropped inputs). *Done when*
      unit tests cover the movement state machine and it feels good by hand. (Unit
      tested; the "by hand" feel is for the user to judge.)
- [x] **M1.6** Interaction: face a tile and press interact; objects dispatch by type.
      *Done when* a sign shows text.
- [x] **M1.7** Doors and warps: fade transition, target map and spawn id, lazy-load
      interior maps and atlases on first entry. *Done when* entering and leaving a
      building keeps facing and position correct.
- [x] **M1.8** Tap and click to move: A* on the collision grid (pure function, unit
      tested), path preview dots, tap on NPC or door walks adjacent then interacts.
      *Done when* it works on a real phone. (Works in phone emulation at DPR 3; a real
      device check is still for the user.)
- [x] **M1.9** Input layer: keyboard, gamepad, pointer unified into actions
      (`move`, `interact`, `back`, `menu`). *Done when* all three drive the same actions.
      (Keyboard and pointer tested; gamepad wired but untested without hardware.)
- [x] **M1.10** Save system: versioned `localStorage` blob (position, map, stamps, flags,
      visited dialogue, settings) with migration and try/catch everywhere. *Done when*
      reload restores state and corrupt data falls back to a new game.
- [x] **M1.11** Deep links: `?at=<place-id>` spawns outside that place and skips the
      title. *Done when* every place id in the content map works.
- [x] **M1.12** Greybox maps: overworld plus one interior, generated by a minimal
      version of the generator (M3.1) or hand-written, enough to exercise M1.4–M1.11.
      *Done when* the whole loop runs in placeholder mode.
- [x] **M1.13** Perf harness: an FPS and frame-time overlay behind `?debug`, plus a
      Playwright check that the game boots without console errors. *Done when* in CI.
      (`.github/workflows/ci.yml`; `?debug` also exposes `window.__fjord` state for tests.)

## M2: Content, dialogue and UI

Goal: every piece of site content is reachable through NPC dialogue with portraits, and
the passport works.

- [x] **M2.1** `content/` module: `profile.ts` (name, tagline, about paragraphs, quick
      facts, email, socials), `projects.ts`, `experience.ts`, `skills.ts`, `places.ts`
      (place ids, names, map positions, stamp ids). Move `data/*.ts` and the copy inlined
      in `Hero`, `About`, `Contact`, `Socials`. *Done when* no copy is left in components
      and types compile. (Projects now have slug ids such as `irlserver`; `places.ts` holds
      the whole content map, and only places already on a map have an `?at=` entrance.)
- [x] **M2.2** WorldState payload: a server function combining `content/` with live
      GitHub data (repos, stats, contributions) into one typed JSON object, embedded in
      `/` as `<script type="application/json">`. `game/` gets the type only. *Done when*
      the game reads real repo names in a debug log. (Static content is imported from
      `content/` directly; the payload carries only live data. Failed fetches are cached
      for minutes, not hours.)
- [x] **M2.3** Ink pipeline: compile `game/dialogue/*.ink` with the inkjs compiler at
      build time; bind external functions (`project_desc`, `project_link`, `repo_count`,
      `repo_name`, `stat`, `has_stamp`, `lanyard_activity`, …); a validator scans the Ink
      source for external calls and literal ids and fails the build on unknown ones.
      *Done when* a typo in an id fails `pnpm build`. (Registry in
      `game/dialogue/externals.ts`; EXTERNAL lines are generated; NPC `dialogue` knots are
      checked against the compiled story too.)
- [x] **M2.4** Dialogue box: LimeZu UI frame, typewriter text with punctuation pauses,
      skip-to-end on second press, choice menus, `* ` narration style, bitmap pixel font
      (reuse the site's pixel fonts, converted to BMFont). *Done when* long text wraps
      and pages correctly. (LimeZu Modern UI style 1 wood frame as a nine-slice, drawn
      stand-in in placeholder mode; Geist Pixel bitmap font; punctuation pauses; choice
      list with keyboard, gamepad and tap.)
- [x] **M2.5** Portraits: build step composites portrait layers per NPC; talk animation
      runs while text types, nod and shake available as Ink tags (`# nod`, `# shake`).
      *Done when* one NPC talks with a moving mouth. (Portraits are recipes in
      `game/assets/manifest.ts`, cropped to 25×25 per frame and shown at 2×.)
- [x] **M2.6** Dialogue blips: per-NPC pitch and waveform, one blip per N characters,
      muted with the master mute. *Done when* two NPCs sound distinct. (Voices in
      `game/audio/blips.ts`; `?debug` counts plays. Whether they sound good is the user's
      call.)
- [x] **M2.7** Links and actions from dialogue: Ink tags `# open:<url>` and
      `# mail` show an in-game confirm ("Open donate.chat in a new tab?"). *Done when*
      every project link and the email work from dialogue. (Tags are
      `# link: project <id>`, `# link: social <id>` and `# link: email`, validated at build.
      Tabs open inside the real key or tap event via `game/ui/LinkOpener.ts`, because
      browsers block popups from Phaser's frame-delayed input. Wiring every project and
      the email into dialogue happens in M2.9.)
- [x] **M2.8** NPC roster and personalities: `game/npcs.ts` defines each NPC (id,
      name, place, sprite layer recipe, portrait recipe, blip voice, Ink knot). Draft names
      and one-line personalities for review. **datagutt NPC recipe follows
      `public/images/avatar.png`** (DESIGN §3). *Done when* the user has reviewed the
      roster. (Approved 2026-09-23 "good for now"; lives in `game/npcs.ts`.)
- [x] **M2.9** Write all Ink scripts (Claude drafts, user edits): ferryman, datagutt
      (and house objects), streamer (Guac), technician (IRLServer), shopkeeper
      (Donate.chat), coworkers (Nettbureau), sysadmin (IØD), trainer (skills; was the smith), librarian
      (repos, live), farmer (stats, live), postmaster (contact), plus 4–6 townsfolk for
      life and hints. Each main NPC: first-visit, repeat, has-stamp variants. *Done when*
      every content field in `content/` is referenced by at least one line (checked by
      the validator's coverage report). (`game/dialogue/coverage.test.ts` checks
      coverage; every conversation is walked to the end in tests with live and empty
      data. Drafts are ready for the user to edit.)
- [x] **M2.10** Passport and stamps: stamp on first full conversation with each main
      NPC, stamp animation and sound, passport screen in the START menu. *Done when*
      all stamps can be collected in one run. (Stamps: `game/progress/`; banner and page:
      `game/ui/Passport.ts`. Enter opens the passport until the START menu wraps it in
      M2.11; touch devices need that menu's on-screen button.)
- [x] **M2.11** START menu: Passport, Journal (opens `/journal`), datagutt's status,
      Settings (volume, mute, show other visitors, reduced motion, shader quality),
      Credits (LimeZu and others). *Done when* navigable by keyboard, gamepad and touch.
      (On-screen Menu button top-left. "datagutt's status" and "Show other visitors"
      are added with M4.2 and M4.5; the menu only lists what works.)

## M3: World generation and art

Goal: the real town, painted, in all seasons.

- [x] **M3.1** Generator core `world/`: layout DSL (terrain regions, coastline, heights,
      roads, building footprints), deterministic seeded RNG, writes Tiled `.tmj` with
      generated layers plus untouched `manual_*` layers merged last. *Done when* running
      it twice is byte-identical and manual layers survive regeneration. (`pnpm world:gen`,
      `world/gen/`, tested in `world/gen/tmj.test.ts`; `pnpm world:check` in CI.)
- [x] **M3.2** Autotiling: terrain transitions (grass/path/sand/water/cliff/snow) using
      LimeZu's tile layouts; a rule table per terrain pair. *Done when* no visible seams in
      a test map. (`world/art/autotile.ts`: 13-piece sets on 7×4 blocks and the animated
      sea, regions thickened first; cliffs are plateau 9-slices; snow comes with M3.9.)
- [ ] **M3.3** Prefabs: multi-tile stamps for each building and landmark (red house
      recolours, boathouse studio with antenna, radio tower, kiosk, office, town hall,
      smithy (now the gym), library, post office, farm field, ferry dock, piers, fjord cliffs). *Done
      when* each prefab renders correctly in isolation.
- [ ] **M3.4** Scatter rules: flowers, rocks, bushes, lamps, benches, fences with
      constraints (keep doors and paths clear, benches face paths, density by region).
      *Done when* the town reads as lived-in in the rendered PNG.
- [x] **M3.5** Render-to-PNG: `pnpm world:render` writes `world/out/<map>.png` (and
      per-season variants) for visual review. *Done when* Claude can view every map.
      (`--grid`, `--objects`, `--collision` overlays; seasons arrive with M3.9.)
- [x] **M3.6** Validator: doors point at existing maps and spawns, every NPC and stamp
      id exists, spawn points are walkable, all places are reachable from the dock,
      warns on edits to generated layers. *Done when* in `pnpm build`. (Started:
      `world/gen/validate.ts` runs in `world:gen`/`world:check` and catches objects on
      blocked tiles, unreachable signs and NPCs, blocked door fronts and stacked objects.
      `pnpm assets` fails on doors to unknown maps or spawns and NPCs without a dialogue
      knot; every map checks that everything is reachable from where players arrive (the
      ferry in town, the entrance indoors); `world:check` fails when committed maps are
      stale, which also catches hand edits to generated layers; `cuts.ts` stops prefabs
      that slice a sprite.)
- [x] **M3.7** Overworld: dock and harbour, town square, datagutt's street, hill with
      radio tower, farm field, forest edge, fjord and cliffs. Iterate on renders until it
      looks good. *Done when* the user approves the overworld render. (Approved
      2026-09-23; `world/gen/maps/overworld.ts` is the live `town`, with name signs on
      every building.)
- [ ] **M3.8** Interiors (10): datagutt's house (with the town scale model), boathouse
      studio, radio tower hut, kiosk, office (a big open floor), town hall and its basement IT department,
      gym (was the smithy), library, farmhouse, post office. *Done when* the user approves each render.
- [x] **M3.9** Seasonal variants: generator emits season layers (snow ground and roof
      caps, autumn foliage, spring flowers), runtime picks the season from the Norwegian
      date. *Done when* all four seasons render and switch via `?season=` in debug.
      (Swap tables per season instead of layers; hand-drawn full snow roofs are
      overrides in datagutt-assets, drafts await cleanup in Aseprite.)
- [x] **M3.10** Character build: composite NPC walk sheets from generator layers per
      recipe; hand-edit the datagutt sprite and portrait to match the avatar (chunky black
      glasses). *Done when* every NPC in the roster has a sprite and portrait. (Every NPC
      got a look fitting their job, reviewed with `pnpm characters:review`. Thickened
      glasses and stubble for datagutt were built and dropped: the user preferred the
      stock glasses recoloured black.)
- [x] **M3.11** Library and farm from live data: one book per pinned repo (spine colour
      from the repo's language), contribution field with one tile per day and crop height
      from the level. *Done when* both reflect real data. (User chose 26 weeks × 7 days,
      GitHub-style, along the top of the farm; `game/live/field.ts`. The featured shelf
      gets a spine per pinned repo in its language colour (`game/live/shelf.ts`) and reads
      them out through the `featured_shelf` knot: signs can run Ink knots now.)
- [x] **M3.12** Closed buildings read as closed (user idea): a building whose interior
      doesn't exist yet (the Nettbureau office for now) gets a visibly shut door (a
      "Stengt / Closed" sign or boarded door) and a line when you try it ("It's locked.
      A note says: back soon."), instead of a door that silently does nothing. *Done
      when* every unlinked building door explains itself. (`building(..., { closed })`:
      the door stays shut with a line of its own and a CLSD sign beside it; the office and
      the four townsfolk villas use it.)

## M4: Live systems

Goal: the town is alive: the datagutt NPC follows Lanyard and other visitors appear.

- [x] **M4.1** Lanyard client in `game/net/lanyard.ts`: plain WebSocket to
      `wss://api.lanyard.rest/socket`, heartbeat, reconnect, typed presence. Discord id
      from WorldState (still `NEXT_PUBLIC_DISCORD_ID` or `DEFAULT_DISCORD_ID`). *Done when*
      presence updates arrive in the game.
- [x] **M4.2** datagutt NPC behaviour (also add "datagutt's status" to the START menu): a state machine mapping presence to place,
      animation and emote (DESIGN open-questions table). Smooth walking between places when
      state changes while the player is watching. Status screen in START menu. *Done when*
      each presence state shows correctly (test with a mocked presence). (Mock with
      `?debug&presence=<name>`; `window.__fjordPresence(name)` switches it live.)
- [x] **M4.3** Ghost protocol v2: rename the route to `/api/world/ws`, messages `join`
      (map), `move` (tile, facing), `emote`, `leave`; server rooms per map; server stamps a
      random name and tint; token bucket per connection; no echo to sender. Keep
      `connection()` before upgrade. *Done when* two browsers see each other move. (Rooms
      in `lib/world/rooms.ts`, shared by the Vercel route and the dev harness, which now
      serves the socket too. The old `/api/reactions/ws` stays until M4.6.)
- [ ] **M4.4** Ghost rendering: translucent tinted sprites, interpolated tile-to-tile,
      name on hover or long-press, cap about 20 per map, fade after 30 s idle. *Done when*
      smooth with 20 simulated ghosts on a phone. (Built; 60 fps with `?debug&ghosts=20` in
      headless phone emulation. Tick after a check on a real phone.)
- [x] **M4.5** Emotes (also add "Show other visitors" to START menu settings): emote wheel (hold interact or long-press self), bubbles from the
      LimeZu emote sheet, sent to the room. Kill switch `rx_off` and the settings toggle
      disable send and receive. *Done when* emotes appear on both clients.
      (Hold interact about 0.4 s, or a long press on the player; `game/ui/EmoteWheel.ts`.
      "Other visitors" in Settings starts or stops the socket; `rx_off` means no client.)
- [x] **M4.6** Remove the old reactions overlay, `useReactionsSocket`, `lib/reactions`
      pieces that are no longer used, and `react-use-lanyard`. *Done when* no dead code is
      left and the build passes.

## M5: Atmosphere and polish

Goal: the Celeste-level feel.

- [x] **M5.1** Lighting and time of day: visitor-local clock drives a colour-grading
      filter (dawn, day, dusk, night), window lights and lamp posts glow at night via a
      light layer. *Done when* `?time=` in debug shows all phases.
- [ ] **M5.2** Water shader: fjord shimmer, shoreline foam, reflections of the sky
      colour. Low-quality fallback. *Done when* it looks good at night and day.
      (Built in `game/fx/Water.ts`; waiting on the user's look at night and day.)
- [ ] **M5.3** Aurora shader: animated curtains on the night sky, stronger in winter,
      site-green palette. *Done when* it runs at 60 fps on a mid-range phone.
      (Built in `game/fx/Aurora.ts`; 60 fps in headless phone emulation, waiting on a real
      phone.)
- [x] **M5.4** Season effects: falling snow particles and frost vignette in winter,
      leaves in autumn, pollen in summer, midnight-sun brightness in June. *Done when*
      each season has one particle effect.
- [ ] **M5.5** Game feel: footstep dust, bump feedback, screen shake on stamps, squash
      on door enter, smooth camera with small look-ahead. Respect reduced motion (no shake,
      fewer particles). *Done when* reviewed by hand with reduced motion on and off.
      (Built in `game/fx/Feel.ts`; waiting on the user's hand review.)
- [x] **M5.6** Audio system: master, ambience and effects buses (music bus ready),
      area-based ambience layers with crossfades, CC0 sources recorded in `CREDITS.md`,
      synthesised effects. *Done when* walking from dock to forest to indoors crossfades.
      (All synthesised for now, the user's call: `game/audio/Ambience.ts`. The sound design
      itself still wants the user's ears.)
- [x] **M5.7** Ferry intro cutscene: ferry arrival, ferryman gives passport, one line on
      controls and Journal; skippable. *Done when* first visit plays it and returning
      visits do not.
- [x] **M5.8** Finale: all stamps → night, aurora, datagutt on the pier, credits roll from
      `content/` (stack, tools, LimeZu credit), ends on contact prompt. *Done when*
      reachable in a full playthrough.
- [ ] **M5.9** Performance pass: atlas count, draw calls, shader tiers (auto-detect plus
      setting), payload under about 1 MB gzipped before interiors. *Done when* 60 fps on a
      mid-range Android phone and an iPhone, measured.
      (Done so far: lossless palette PNGs and max-effort compression in the asset build,
      87 KB less; an Effects setting, Auto/High/Low, where Low drops the water and aurora
      shaders and thins the weather, and Auto drops to Low when the first seconds on a map
      run under 45 fps. Waiting on real-phone measurements.)
- [x] **M5.10** Interaction prompts (user idea): when you face something usable, a small
      prompt shows the button and the action ("E  Talk", "E  Enter", "E  Read"), matching
      the input in use (keyboard key, gamepad button, a tap hint on touch). *Done when*
      every NPC, sign and door shows the right prompt on all three inputs.
- [ ] **M5.11** Title screen v2 (user idea): a pixel-art sky and fjord built from the
      game's own sprites where possible, with the energy of Sonic, Undertale and Terraria
      title screens (parallax, drifting clouds, a hint of motion). Logo in a Geist Pixel
      variant with a chunky drop shadow. "Press start" first, then a menu: Continue, New
      game, Credits, and a clearly worded way to the plain site (not just "Journal", e.g.
      "Read it as a normal website"). *Done when* the user approves it on desktop and phone.

## M6: Journal, accessibility and launch

Goal: ship v1 to production.

- [ ] **M6.1** `/journal`: server-rendered, plain and readable, every `content/` field and
      live GitHub data, anchors per section, link back into the game with `?at=`. Shows
      passport progress client-side if a save exists. *Done when* it passes an axe check
      and reads well with JS disabled.
- [ ] **M6.2** Metadata: titles, descriptions, Open Graph image (a render of the town),
      sitemap with `/` and `/journal`, canonical links. *Done when* link previews look
      right on Bluesky and Discord.
- [ ] **M6.3** Accessibility of the game shell: canvas has an accessible name pointing to
      the Journal, the title screen is fully keyboard operable, reduced motion honoured,
      focus is never trapped. *Done when* a screen-reader pass reaches the Journal in one
      step.
- [ ] **M6.4** Credits: LimeZu attribution (required) in the START menu, the finale and
      the Journal footer; CC0 audio sources. *Done when* visible in all three.
- [ ] **M6.5** Remove the legacy site: `app/_legacy/`, old section components, canvases
      that were not ported, GSAP if unused, `data/`. Update `CLAUDE.md` to describe the new
      architecture. *Done when* no references remain and `pnpm build` passes.
- [ ] **M6.6** QA matrix: Chrome, Firefox, Safari desktop; iOS Safari; Android Chrome;
      gamepad; slow 3G; full playthrough on each. *Done when* no blockers remain.
- [ ] **M6.7** Launch: merge `game` into `master`, production deploy, verify live
      deployment, check runtime logs for errors. **Needs the user** to approve. *Done when*
      datagutt.no serves the game.

---

## v1.1 backlog

- [ ] **B1** Arcade cabinets: existing canvases rendered into Phaser `CanvasTexture`s in a
      youth-club arcade; falling blocks becomes playable with a local high score.
- [ ] **B2** PC screensaver (Game of Life) in datagutt's house; hill telescope shows the
      starfield at night.
- [ ] **B3** Secrets and achievements: hidden cat, fourth-wall lines when walking off the
      map edge, achievement list in the passport.
- [ ] **B4** Music: pick or commission tracks per area with day and night variants.
- [x] **B5** Buy Modern Office if interiors need more variety. *(Bought 2026-09-23; used by the office.)*

## v2 backlog

- [ ] **C1** Terraria-style side-view mine under the hill; tech stack moves there; room
      layout from the dungeon generator.
- [ ] **C2** Weather: rain, fog, storms, tied to real Norwegian weather or random.
- [ ] **C3** Multi-instance ghosts: Upstash Redis pub/sub or Durable Objects.
