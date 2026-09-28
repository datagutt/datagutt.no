#!/usr/bin/env bash
# Stop hook: on the game and kai branches, blocks the session from ending once when
# there are code commits newer than the last commit that touched that branch's HANDOFF.md.
set -u

input="$(cat)"
# Already continuing because of this hook: let the session stop, never loop.
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
	exit 0
fi

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo)"
case "$branch" in
	game | game/*) rel="apps/datagutt/docs" ;;
	kai | kai/*) rel="docs/kai" ;;
	*) exit 0 ;;
esac
[ -f "$root/$rel/HANDOFF.md" ] || exit 0

last_code="$(git -C "$root" log -1 --format=%ct -- . ":(exclude)$rel" 2>/dev/null)"
last_handoff="$(git -C "$root" log -1 --format=%ct -- "$rel/HANDOFF.md" 2>/dev/null)"
[ -n "$last_code" ] || exit 0
[ -n "$last_handoff" ] || last_handoff=0

if [ "$last_code" -gt "$last_handoff" ]; then
	cat <<JSON
{"decision":"block","reason":"There are commits on $branch newer than the last $rel/HANDOFF.md update. Before stopping: rewrite $rel/HANDOFF.md (current state, next step, blockers, gotchas), make sure finished tasks are ticked in $rel/PLAN.md, and commit both. If this turn only answered a question and the handoff is already accurate, say so and stop."}
JSON
fi
exit 0
