# Handoff

Last updated: 2026-09-22 (session 1: design, planning, assets repo, M0 tooling)

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
- M0.6 to M0.10 done: `scripts/assets/fetch.mjs` (+ tested `source.mjs`), ignore rules
  for generated/licensed output, deps (phaser 4.2.1, inkjs 2.4.0, pngjs, vitest 5,
  Playwright 1.63, @types/node 24), ESLint boundary for `game/`, `pnpm test` and
  `pnpm test:e2e` (smoke test of `/` on desktop and phone). `pnpm lint` was broken
  (Next 16 removed `next lint`) and now runs the ESLint CLI.

## Next step

**M0.11** is waiting on the user's token. Meanwhile start **M1.1** (Next.js shell with
HTML title screen and client-only game mount) and **M1.2** (Phaser config).

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
- `next dev` (canary Turbopack) panicked on this repo during M0.10, so Playwright runs
  against `next start`; run `pnpm build` before `pnpm test:e2e`.
- pnpm does not run `pre*`/`post*` scripts; chain steps inside the script instead.
- `pkill -f <pattern>` inside a Bash call can match and kill that same shell. Use a
  pattern that doesn't appear in the command, or kill by PID.
- Phaser ships `docs/` and `skills/` inside `node_modules/phaser`. Read those for
  Phaser 4 APIs.
- `jq` is not installed on this machine; hook scripts use plain shell and node.
- The datagutt NPC must match `public/images/avatar.png` (blond hair, chunky black square
  glasses, stubble, light-blue top).
