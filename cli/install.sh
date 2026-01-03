#!/bin/bash
set -e

echo "Installing plugin-kit..."
echo

# Check if trash-cli is installed
if ! command -v trash &> /dev/null; then
  echo "trash-cli is not installed."
  echo "It provides safe file deletion by moving files to trash instead of permanently deleting them."
  echo
  read -p "Would you like to install trash-cli? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing trash-cli..."
    npm install -g trash-cli
    echo
  else
    echo "Skipping trash-cli installation."
    echo "plugin-kit will rename existing plugins to *_backup when overriding."
    echo
  fi
fi

# Install dependencies
echo "Installing dependencies..."
cd "$(dirname "$0")"
bun install

# Build (pack plugins + generate metadata + compile binary)
echo
echo "Building..."
bun run build

# Install binary to ~/.local/bin (no sudo needed)
INSTALL_DIR="$HOME/.local/bin"
BINARY_NAME="plugin-kit"

mkdir -p "$INSTALL_DIR"

echo
echo "Installing binary to $INSTALL_DIR..."
cp "./dist/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo
  echo "Warning: $INSTALL_DIR is not in your PATH."
  echo "Add this to your shell config:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo
echo "Done! plugin-kit is now available globally."

# Check if pk command exists
PK_PATH=$(which pk 2>/dev/null || true)

if [[ -n "$PK_PATH" && "$PK_PATH" == *"plugin-kit"* ]]; then
  # Already points to plugin-kit (symlink exists)
  echo "Run 'plugin-kit' or 'pk' to start."
elif [[ -n "$PK_PATH" ]]; then
  # Conflicts with existing command
  echo "Run 'plugin-kit' to start."
  echo "(Note: 'pk' is already in use by another command)"
else
  # Create symlink for pk
  ln -sf "$INSTALL_DIR/$BINARY_NAME" "$INSTALL_DIR/pk"
  echo "Run 'plugin-kit' or 'pk' to start."
fi
