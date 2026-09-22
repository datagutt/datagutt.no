# Handoff

Last updated: 2026-09-22 (session 1: design, planning, assets repo, M0, M1.1–M1.2)

## Current state

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

**M1.3**: asset pipeline (`scripts/assets/build.mjs`): pack the sprites and tilesets the
game uses into `public/game/`, with placeholder output of the same shape. Inspect the
LimeZu character sheet layout first (`limezu/characters/Spritesheet_animations_GUIDE.png`).
The user said to focus on local testing: **M0.11 (Vercel token) is deferred** until they
ask for it.

## Blockers and things waiting on the user

- A fine-grained read-only token for that repo, stored in Vercel as `ASSETS_REPO_TOKEN`
  (M0.11).
- Review of the NPC roster and dialogue drafts later in M2.

## Gotchas learned so far

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
- Phaser ships `docs/` and `skills/` inside `node_modules/phaser`. Read those for
  Phaser 4 APIs.
- `jq` is not installed on this machine; hook scripts use plain shell and node.
- The datagutt NPC must match `public/images/avatar.png` (blond hair, chunky black square
  glasses, stubble, light-blue top).
