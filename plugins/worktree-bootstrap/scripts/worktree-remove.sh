#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT=$(cat)

if command -v python3 &>/dev/null; then
    echo "$INPUT" | python3 "$SCRIPT_DIR/worktree_bootstrap.py" remove || true
else
    echo "worktree-bootstrap: python3 not found, falling back to basic worktree removal" >&2
    WORKTREE_PATH=$(echo "$INPUT" | grep -o '"worktree_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"worktree_path"[[:space:]]*:[[:space:]]*"//;s/"$//')
    CWD=$(echo "$INPUT" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"cwd"[[:space:]]*:[[:space:]]*"//;s/"$//')
    if [ -n "$WORKTREE_PATH" ] && [ -d "$WORKTREE_PATH" ]; then
        git -C "$CWD" worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
    fi
fi

exit 0
