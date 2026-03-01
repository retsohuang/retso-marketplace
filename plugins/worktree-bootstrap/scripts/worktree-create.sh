#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT=$(cat)

if command -v python3 &>/dev/null; then
    echo "$INPUT" | python3 "$SCRIPT_DIR/worktree_bootstrap.py" create
else
    echo "worktree-bootstrap: python3 not found, falling back to basic worktree creation" >&2
    CWD=$(echo "$INPUT" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"cwd"[[:space:]]*:[[:space:]]*"//;s/"$//')
    NAME=$(echo "$INPUT" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"name"[[:space:]]*:[[:space:]]*"//;s/"$//')
    WORKTREE_PATH="$CWD/.claude/worktrees/$NAME"
    mkdir -p "$(dirname "$WORKTREE_PATH")"
    git -C "$CWD" worktree add "$WORKTREE_PATH"
    echo "$WORKTREE_PATH"
fi
