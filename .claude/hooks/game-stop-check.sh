#!/usr/bin/env bash
# Stop hook: on the game branches, blocks the session from ending once when there
# are code commits newer than the last commit that touched docs/game/HANDOFF.md.
set -u

input="$(cat)"
# Already continuing because of this hook: let the session stop, never loop.
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
	exit 0
fi

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
[ -f "$root/docs/game/HANDOFF.md" ] || exit 0

branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo)"
case "$branch" in
	game | game/*) ;;
	*) exit 0 ;;
esac

last_code="$(git -C "$root" log -1 --format=%ct -- . ':(exclude)docs/game' 2>/dev/null)"
last_handoff="$(git -C "$root" log -1 --format=%ct -- docs/game/HANDOFF.md 2>/dev/null)"
[ -n "$last_code" ] || exit 0
[ -n "$last_handoff" ] || last_handoff=0

if [ "$last_code" -gt "$last_handoff" ]; then
	cat <<'JSON'
{"decision":"block","reason":"There are commits on the game branch newer than the last docs/game/HANDOFF.md update. Before stopping: rewrite docs/game/HANDOFF.md (current state, next step, blockers, gotchas), make sure finished tasks are ticked in docs/game/PLAN.md, and commit both. If this turn only answered a question and the handoff is already accurate, say so and stop."}
JSON
fi
exit 0
