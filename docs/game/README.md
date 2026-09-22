# Fjord Town docs

The portfolio is being rebuilt as a top-down pixel-art game on the `game` branch.

| File | What it holds | Who updates it |
|---|---|---|
| [DESIGN.md](./DESIGN.md) | Every design decision and the defaults for open questions | Changed only when a decision changes; add a changelog line |
| [PLAN.md](./PLAN.md) | Milestones and tasks with checkboxes; the progress source of truth | Tick boxes in the same commit as the work |
| [HANDOFF.md](./HANDOFF.md) | Where the last session stopped and what to do next | Rewrite at the end of every working session |

## Session workflow (for Claude and humans)

1. **Start.** A SessionStart hook (`.claude/hooks/game-session-start.sh`) prints
   HANDOFF.md, the open tasks of the current milestone and recent git state into the
   session. Read it before doing anything. Do not re-decide what DESIGN.md settles.
2. **Pick work.** Take the next unticked task in PLAN.md unless HANDOFF.md or the user
   says otherwise. Tasks marked **Needs the user** require their approval first.
3. **Work.** Keep commits small. When a task's *Done when* check passes, tick its box
   in the same commit.
4. **Hand off.** Before ending, rewrite HANDOFF.md (state, next step, blockers, gotchas)
   and commit it. A Stop hook (`.claude/hooks/game-stop-check.sh`) blocks the session
   from ending once when there are code commits newer than the last HANDOFF.md commit.
5. **Milestone done.** When every task in a milestone is ticked, close its GitHub issue
   with a short comment and move HANDOFF.md to the next milestone.

## GitHub issues

| Milestone | Issue |
|---|---|
| M0 Foundations and tooling | [#3](https://github.com/datagutt/datagutt.no/issues/3) |
| M1 Engine core (greybox) | [#4](https://github.com/datagutt/datagutt.no/issues/4) |
| M2 Content, dialogue and UI | [#5](https://github.com/datagutt/datagutt.no/issues/5) |
| M3 World generation and art | [#6](https://github.com/datagutt/datagutt.no/issues/6) |
| M4 Live systems | [#7](https://github.com/datagutt/datagutt.no/issues/7) |
| M5 Atmosphere and polish | [#8](https://github.com/datagutt/datagutt.no/issues/8) |
| M6 Journal, accessibility and launch | [#9](https://github.com/datagutt/datagutt.no/issues/9) |

## Things that are easy to get wrong

- Never commit licensed pixels to this repo, including packed atlases. See DESIGN §9.
- `game/` must not import Next.js or React. ESLint enforces it once M0.9 lands.
- Phaser 4 changed APIs from Phaser 3. Check the installed package's docs and types
  rather than memory.
- Credit to LimeZu is a licence requirement, not a nicety.
