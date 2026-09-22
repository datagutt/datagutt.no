# Fjord Town: design record

The portfolio at datagutt.no is being rebuilt as a top-down pixel-art game. This file
records every decision made during the design grilling session on 2026-09-22, so later
sessions do not re-litigate them. If a decision changes, edit it here and add a line to
the changelog at the bottom.

Related files: [PLAN.md](./PLAN.md) (tasks and progress), [HANDOFF.md](./HANDOFF.md)
(session-to-session state), [README.md](./README.md) (workflow rules).

## 1. Audience and access

- The game is the site. Built for curious visitors (devs, streamers) who explore.
- Visitors in a hurry are never locked out. The **Journal** is a plain, server-rendered
  page at `/journal` with all content in boring normal HTML. It doubles as the SEO and
  screen-reader path. It is linked from the title screen, a persistent corner button,
  and the in-game START menu.
- Content is spread over several areas, buildings and NPCs. Talking to an NPC gives the
  details.

## 2. Genre and camera

- Top-down, grid-based movement on a 16×16 tile grid (Pokémon, Undertale, Stardew).
- Celeste contributes game feel only: particles, screen shake, tight input, mood.
- A Terraria-style side-view mine is planned for v2 (tech stack moves there).

## 3. Player and the datagutt NPC

- The visitor is a newcomer to town. datagutt (Thomas) is an NPC who lives there.
- The datagutt NPC is live: location, animation and emote bubble are driven by Lanyard
  presence (coding at the PC, headphones outside when Spotify plays, asleep when offline).
- **The datagutt sprite and portrait are based on `public/images/avatar.png`**: short
  blond (yellow) hair, pale skin, thick black square glasses, light stubble, light-blue
  top. Built from the closest character-generator and portrait-generator layers, then
  hand-edited where the stock parts differ (the chunky glasses in particular). The
  original avatar also appears as-is on the title screen, in the Journal and as the
  framed photo in the house.

## 4. Setting

- A small Norwegian fjord town: red wooden houses, ferry dock, pine forest, hills,
  aurora at night. A light tech twist: the buildings are the work.
- The site's green palette survives in UI accents and the aurora.
- Day and night follow the **visitor's local clock**.
- **Seasons follow the Norwegian calendar** (the town is in Norway): winter Dec to Feb
  with snow, spring Mar to May, summer Jun to Aug, autumn Sep to Nov. Seasons ship in v1.

## 5. Content map

| Content | Place | Presenter |
|---|---|---|
| Arrival, controls, Journal | Ferry dock | Ferryman gives passport and explains controls |
| Hero (name, tagline, avatar) | datagutt's red house | datagutt NPC (live) and his PC |
| About | datagutt's house: bookshelf, wall photos, fridge notes | datagutt NPC and inspectable objects |
| Guac.tv | Boathouse studio at the harbour | Streamer NPC, wall of screens |
| IRLServer | Radio tower on the hill | Technician NPC, bonded cables |
| Donate.chat | Kiosk in the town square | Shopkeeper NPC, tip jar |
| Portfolio (this site) | Scale model of the town in datagutt's house | Meta joke: "you're standing in it" |
| Nettbureau (current job) | Office building, town centre | Coworker NPCs |
| Indre Østfold Data IKS | Town hall basement server room | Old sysadmin NPC |
| Tech stack (6 categories) | Smithy/workshop, tools on 6 racks | Smith NPC (moves to the mine in v2) |
| Open source (pinned repos, live) | Public library, one book per repo | Librarian NPC |
| GitHub stats and contributions (live) | Farm field, one tile per day, crop height = commits | Farmer NPC |
| Contact (email, socials) | Post office: write a letter, noticeboard | Postmaster NPC |

## 6. Progression

- **Fjord Passport**: every building's main NPC stamps it. Nothing is gated.
- A full passport unlocks the finale: night falls, aurora, datagutt on the pier, a short
  credits roll built from the real stack, ending on the contact prompt.
- Progress lives in `localStorage` (versioned save). The Journal shows stamp progress.

## 7. Engine and architecture

- **Phaser 4** (4.2.x at time of writing), WebGL, custom shaders and filters.
- The game lives in `game/` and imports nothing from Next.js or React, so it can be
  lifted out into a standalone game later (Tauri, Electron, Capacitor).
- `/` is a thin Next.js page: server-rendered HTML title screen, client-only dynamic
  import of the game. Server-fetched world data is embedded as JSON in the page.
- `/journal` is a fully server-rendered page built from the same `content/` module.
- In-game UI (dialogue, menus, passport) is drawn in-engine with bitmap pixel fonts.

## 8. Art

- LimeZu packs, 16×16, one artist and one palette: **Modern Exteriors**, **Modern
  Interiors** (includes the character generator), **Modern User Interface** (includes the
  portrait generator). **Modern Office** is optional and not bought yet.
- Licence: commercial use and edits allowed, **credit to LimeZu required**
  (https://limezu.itch.io/), **no redistribution**. The game needs a visible credit.
- **Mana Seed is banned for this project**: its licence forbids use alongside
  AI-generated code.
- Custom pieces: red Norwegian house recolours, fjord cliffs. Snow, frost, water,
  aurora, weather and lighting are shader or overlay work.
- NPC sprites and portraits are composited in code at build time from the generator
  layer PNGs (body, eyes, outfit, hair, accessory). No GUI clicking.

## 9. Licensed asset storage

- Raw packs live in a **private repo `datagutt/datagutt-assets`** (local checkout at
  `../datagutt-assets`). Only extracted 16×16 files and generator layers go in it, not
  the zips, 32/48 px copies or executables.
- The public repo never contains licensed pixels. That includes **packed atlases**:
  build output under `public/game/` is gitignored and produced at build time.
- Vercel cannot pull private git submodules, so the build clones the assets repo with a
  read-only token (`ASSETS_REPO_TOKEN`). Locally the pipeline reads `ASSETS_DIR`
  (default `../datagutt-assets`).
- Without the assets repo the build still works in **placeholder mode** (coloured
  rectangles), so forks and clones stay buildable.

## 10. Maps

- Claude paints the maps; the user does small touch-ups in Tiled.
- **The generator is the source of truth.** Layout as code, prefabs, autotiling and
  seeded scatter rules produce Tiled `.tmj` files that Phaser loads natively.
- Every map has `manual_*` layers (for example `manual_decor`, `manual_erase`,
  `manual_collision`) that the generator never overwrites and merges last.
- A render-to-PNG step lets Claude look at each map and iterate visually.
- A validator checks doors, NPC ids, stamp ids, collision and edits to generated layers.

## 11. Dialogue

- Voice: warm Stardew base, Undertale seasoning. Facts are stated plainly; jokes live in
  optional lines, repeat conversations and inspectable objects (`* ` narration).
  Light Norwegian flavour.
- Claude drafts every line; the user edits.
- Written in **Ink** (`inkjs` runtime, compiled at build time). Facts come from the
  `content/` module and live data through Ink external functions such as
  `project_desc("irlserver")`. A validator fails the build on unknown ids.
- Portraits with talk, nod and head-shake animations come from the portrait generator.
  Portraits are optional per NPC.

## 12. Content source of truth

- One typed `content/` module holds all copy: what is now in `data/*.ts` plus the text
  inlined in `Hero`, `About` and `Contact`. The Journal and the game read only from it.
- Live data (`lib/github.ts`: pinned repos, stats, contributions) keeps its current
  server-side caching and feeds both.

## 13. Controls and viewport

- Touch: **tap to move** with A* pathfinding; tap an NPC or door to walk there and
  interact; tap anywhere to advance dialogue. No virtual D-pad for now.
- Desktop: arrows/WASD, E/Space/Z interact, X/Esc back, Enter START menu, click to
  move, gamepad via Phaser.
- Fixed tile height, variable width, integer zoom, camera clamped to map bounds.
- The Journal button is always visible on touch devices.

## 14. Multiplayer

- **Ghost visitors**: other visitors appear as translucent, randomly tinted sprites in
  real time, with emote bubbles. No chat.
- Presence is sent only on tile change. One room per map. At most about 20 ghosts
  drawn per map. Ghosts fade after 30 s idle. Random names such as "Traveller from Bergen".
- Transport stays on the existing Vercel WebSocket route (`/api/reactions/ws`, to be
  renamed). The single-instance fan-out limit is accepted; upgrade path is Upstash Redis
  pub/sub or a Cloudflare Durable Object per room.
- Kill switch `rx_off` stays, plus a "Show other visitors" setting.

## 15. Audio

- v1: layered ambience (waves, gulls, wind, rain, indoor fire) from CC0 sources, sound
  effects synthesised in code (jsfxr-style), per-NPC Undertale-style dialogue blips.
- Music is **not** in v1, but the audio system supports per-area music layers, day/night
  variants and crossfades from day one. Music is added in v1.1.
- Audio starts on the title screen's user gesture. Mute is persisted.

## 16. First 10 seconds

1. Server-rendered HTML title screen (under 50 KB): fjord at dusk, logo, **Start** and
   **Journal**.
2. Phaser, atlases, Ink and the first map stream in behind it. Start shows progress.
3. First visit: skippable ferry arrival (about 10 s). Returning visit: Continue or New
   game.
4. `?at=<place>` deep links skip the title and spawn outside that place.
- Budget: about 1 MB gzipped for the game payload, interiors lazy-loaded, 60 fps on a
  mid-range phone, shader quality tiers.

## 17. Fate of the current site

- The 5 canvases become arcade cabinets, the PC screensaver and the hill telescope
  (v1.1). The dungeon generator may lay out the v2 mine.
- GSAP ScrollTrigger sections, ScrollText, pixel dividers, glitch CSS and the section
  components are deleted.
- The Lanyard card is replaced by the live NPC and a status screen in the START menu.
  `react-use-lanyard` is replaced by a small plain WebSocket client.
- The reactions overlay is replaced by ghosts and emotes.

## 18. Scope

- **v1 (launch)**: overworld and every interior on the content map, all NPCs with Ink
  dialogue and portraits, live datagutt NPC, passport and finale, day/night, **seasons**,
  water and aurora shaders, particles and screen shake, ghosts and emotes, ambience and
  effects and blips, title screen and ferry intro and Continue and deep links, `/journal`,
  tap-to-move and keyboard and gamepad, LimeZu credit.
- **v1.1**: arcade cabinets, secrets and achievements, music.
- **v2**: Terraria-style mine, weather.

## 19. Rollout

- Long-lived `game` branch with Vercel preview deployments.
- Production stays on the current site until v1 is complete, then one switch-over merge
  to `master`.

## Open questions (defaults in force until the user says otherwise)

| Question | Default |
|---|---|
| Internal resolution | 16 px tiles, integer zoom chosen so the short screen axis shows at least 11 tiles |
| NPC names and personalities | Claude drafts them in M2 alongside the Ink scripts, user edits |
| Lanyard activity to NPC location mapping | Coding app → PC in house; Spotify → bench by the fjord with headphones; online idle → wandering town square; offline → asleep in bed; custom status text → speech bubble |
| Ghost name format | "Traveller from <Norwegian town>", random per session |
| Analytics | None added; existing setup untouched |
| Language | English, with occasional Norwegian words |

## Changelog

- 2026-09-22: initial record from the grilling session.
