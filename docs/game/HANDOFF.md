# Handoff

Last updated: 2026-09-22 (session 1: design grilling, planning, private assets repo)

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

## Next step

**M0.6**: `scripts/assets/fetch.mjs` (ASSETS_DIR, token clone, placeholder mode), then
M0.7 to M0.10. Ask the user for the Vercel token when starting M0.11.

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
- `jq` is not installed on this machine; hook scripts use plain shell and node.
- The datagutt NPC must match `public/images/avatar.png` (blond hair, chunky black square
  glasses, stubble, light-blue top).
