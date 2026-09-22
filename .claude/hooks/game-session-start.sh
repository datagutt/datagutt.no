#!/usr/bin/env bash
# SessionStart hook: puts the Fjord Town handoff, the open tasks of the current
# milestone and recent git state into the session context. Plain stdout from a
# SessionStart hook is added to Claude's context.
set -u

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
docs="$root/docs/game"
[ -f "$docs/HANDOFF.md" ] || exit 0

branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

echo "## Fjord Town game project: session context"
echo
echo "Branch: $branch. Read docs/game/README.md for the workflow; decisions are in"
echo "docs/game/DESIGN.md and must not be re-litigated. Update docs/game/HANDOFF.md and"
echo "tick docs/game/PLAN.md boxes in the same commit as the work."
echo
cat "$docs/HANDOFF.md"
echo

if [ -f "$docs/PLAN.md" ]; then
	# Print the first milestone section that still has unticked tasks, open tasks only.
	awk '
		/^## M[0-9]+:/ { if (found) exit; heading = $0; open = 0; next }
		/^## / { if (found) exit; heading = ""; next }
		heading != "" && /^- \[ \] \*\*/ {
			if (!found) { print "## Open tasks in current milestone"; print heading; found = 1 }
			print; inTask = 1; next
		}
		/^- \[/ { inTask = 0; next }
		inTask && /^      / { print; next }
		{ inTask = 0 }
	' "$docs/PLAN.md"
	echo
fi

echo "## Git state"
git -C "$root" log --oneline -5 2>/dev/null
status="$(git -C "$root" status --short 2>/dev/null | head -20)"
if [ -n "$status" ]; then
	echo
	echo "Uncommitted changes (possibly unfinished work from the last session):"
	echo "$status"
fi
exit 0
