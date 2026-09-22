# Handoff

Last updated: 2026-09-22 (session 1: design grilling and planning)

## Current state

- Branch `game` created from `master` at `bc7041e`.
- Design settled in a grilling session; everything is recorded in DESIGN.md.
- Planning docs, session hooks and milestone issues are in place (M0.1 to M0.4 done).
- No game code yet. The live site on `master` is untouched.
- The user bought and downloaded LimeZu Modern Exteriors, Modern Interiors (with the
  character generator) and Modern User Interface (with the portrait generator). The zips
  sit unextracted in `../datagutt-assets/`, which is not yet a git repo.

## Next step

**M0.5**: extract the 16×16 folders and generator layers in `../datagutt-assets/`, add
`LICENSES.md`, `git init`, and ask the user before creating the private GitHub repo
`datagutt/datagutt-assets`. Then M0.6 to M0.11.

## Blockers and things waiting on the user

- Creating the private GitHub repo `datagutt/datagutt-assets` (M0.5).
- A fine-grained read-only token for that repo, stored in Vercel as `ASSETS_REPO_TOKEN`
  (M0.11).
- Review of the NPC roster and dialogue drafts later in M2.

## Gotchas learned so far

- Vercel cannot pull private git submodules, so the build clones the assets repo with a
  token instead (DESIGN §9).
- The Mana Seed licence forbids use alongside AI-generated code. Do not use it.
- `.gitignore` tracks only `.claude/settings.json` and `.claude/hooks/`; everything else in
  `.claude/` (such as `settings.local.json`) stays ignored.
- `jq` is not installed on this machine; hook scripts use plain shell and node.
- The datagutt NPC must match `public/images/avatar.png` (blond hair, chunky black square
  glasses, stubble, light-blue top).
