#!/usr/bin/env python3
"""Worktree bootstrap: copy gitignored files to new worktrees."""

import glob
import json
import os
import re
import shutil
import subprocess
import sys


def parse_worktreeinclude(config_path):
    """Parse .worktreeinclude.yaml without PyYAML (flat files: list only)."""
    files = []
    in_files_block = False
    with open(config_path, "r") as f:
        for line in f:
            stripped = line.strip()
            if stripped.startswith("files:"):
                # Check for inline list: files: [".env", ".env.local"]
                after = stripped[len("files:"):].strip()
                if after.startswith("["):
                    # Inline YAML list
                    items = after.strip("[]").split(",")
                    for item in items:
                        item = item.strip().strip("'\"")
                        if item:
                            files.append(item)
                    return files
                in_files_block = True
                continue
            if in_files_block:
                # Another top-level key ends the block
                if re.match(r"^[a-zA-Z]", line) and ":" in stripped:
                    break
                match = re.match(r"^\s+-\s+(.+)$", line)
                if match:
                    value = match.group(1).strip().strip("'\"")
                    # Strip inline YAML comments (e.g., ".env  # comment")
                    if " #" in value:
                        value = value[:value.index(" #")].rstrip()
                    if value:
                        files.append(value)
    return files


def resolve_globs(patterns, project_root):
    """Expand glob patterns against the project root."""
    resolved = set()
    for pattern in patterns:
        full_pattern = os.path.join(project_root, pattern)
        matches = glob.glob(full_pattern)
        if not matches:
            print(f"worktree-bootstrap: no files matched pattern '{pattern}'", file=sys.stderr)
        for match in matches:
            rel = os.path.relpath(match, project_root)
            if os.path.isfile(match):
                resolved.add(rel)
    return sorted(resolved)


def filter_gitignored(files, project_root):
    """Keep only files that are ignored by git."""
    if not files:
        return []
    ignored = []
    for f in files:
        result = subprocess.run(
            ["git", "check-ignore", "-q", f],
            cwd=project_root,
            capture_output=True,
        )
        if result.returncode == 0:
            ignored.append(f)
    return ignored


def copy_files(files, project_root, worktree_path):
    """Copy files preserving directory structure."""
    for f in files:
        src = os.path.join(project_root, f)
        dst = os.path.join(worktree_path, f)
        if not os.path.isfile(src):
            print(f"worktree-bootstrap: file not found '{f}', skipping", file=sys.stderr)
            continue
        dst_dir = os.path.dirname(dst)
        if dst_dir:
            os.makedirs(dst_dir, exist_ok=True)
        shutil.copy2(src, dst)
        print(f"worktree-bootstrap: copied '{f}'", file=sys.stderr)


def handle_create(data):
    """Handle WorktreeCreate: create worktree, copy files, print path."""
    cwd = data["cwd"]
    name = data["name"]
    worktree_path = os.path.join(cwd, ".claude", "worktrees", name)

    # Create the worktree
    os.makedirs(os.path.dirname(worktree_path), exist_ok=True)
    result = subprocess.run(
        ["git", "worktree", "add", worktree_path],
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"worktree-bootstrap: git worktree add failed: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)

    # Check for .worktreeinclude.yaml
    config_path = os.path.join(cwd, ".worktreeinclude.yaml")
    if os.path.isfile(config_path):
        patterns = parse_worktreeinclude(config_path)
        if patterns:
            resolved = resolve_globs(patterns, cwd)
            filtered = filter_gitignored(resolved, cwd)
            if filtered:
                copy_files(filtered, cwd, worktree_path)
            else:
                print("worktree-bootstrap: no gitignored files matched, skipping copy", file=sys.stderr)

    # Must print the worktree path to stdout
    print(worktree_path)


def handle_remove(data):
    """Handle WorktreeRemove: remove worktree directory."""
    worktree_path = data.get("worktree_path", "")

    if not worktree_path or not os.path.exists(worktree_path):
        print(f"worktree-bootstrap: worktree path does not exist '{worktree_path}'", file=sys.stderr)
        return

    cwd = data.get("cwd", os.getcwd())
    result = subprocess.run(
        ["git", "worktree", "remove", "--force", worktree_path],
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"worktree-bootstrap: git worktree remove failed: {result.stderr.strip()}", file=sys.stderr)


def main():
    if len(sys.argv) < 2:
        print("Usage: worktree_bootstrap.py <create|remove>", file=sys.stderr)
        sys.exit(1)

    action = sys.argv[1]
    data = json.loads(sys.stdin.read())

    if action == "create":
        handle_create(data)
    elif action == "remove":
        handle_remove(data)
    else:
        print(f"worktree-bootstrap: unknown action '{action}'", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
