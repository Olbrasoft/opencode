#!/bin/bash
set -e

# OpenCode Notify Plugin - Publish Script
# Publishes built plugin to production directory

PROJECT_NAME="opencode-notify-plugin"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$HOME/virtual-assistant/opencode/plugins/$PROJECT_NAME"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         OpenCode Notify Plugin - Publish Script             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# Step 1: Check dist exists
if [ ! -d "$SOURCE_DIR/dist" ]; then
    echo "❌ dist/ directory not found! Run 'npm run build' first."
    exit 1
fi

# Step 2: Create target directory
echo "📁 Creating target directory..."
mkdir -p "$TARGET_DIR"
echo "✅ Target directory: $TARGET_DIR"
echo

# Step 4: Clean target (optional - keep commented for safety)
# echo "🧹 Cleaning target directory..."
# rm -rf "$TARGET_DIR"/*

# Step 3: Copy files
echo "📋 Copying files..."

# Copy dist directory
cp -r "$SOURCE_DIR/dist" "$TARGET_DIR/"
echo "  ✓ dist/"

# Copy package.json
cp "$SOURCE_DIR/package.json" "$TARGET_DIR/"
echo "  ✓ package.json"

# Copy README
if [ -f "$SOURCE_DIR/README.md" ]; then
    cp "$SOURCE_DIR/README.md" "$TARGET_DIR/"
    echo "  ✓ README.md"
fi

echo "✅ Files copied"
echo

# Step 4: Copy to OpenCode plugin directory
echo "🔌 Installing to OpenCode plugin directory..."
OPENCODE_PLUGIN_DIR="$HOME/.config/opencode/plugin"
mkdir -p "$OPENCODE_PLUGIN_DIR"
cp "$SOURCE_DIR/dist/index.js" "$OPENCODE_PLUGIN_DIR/notify.js"
echo "  ✓ Copied to $OPENCODE_PLUGIN_DIR/notify.js"
echo

# Step 5: Verify
echo "🔍 Verifying published files..."
if [ -f "$TARGET_DIR/dist/index.js" ]; then
    echo "  ✓ dist/index.js exists"
else
    echo "  ❌ dist/index.js missing!"
    exit 1
fi

if [ -f "$TARGET_DIR/package.json" ]; then
    echo "  ✓ package.json exists"
else
    echo "  ❌ package.json missing!"
    exit 1
fi

if [ -f "$OPENCODE_PLUGIN_DIR/notify.js" ]; then
    echo "  ✓ OpenCode plugin installed"
else
    echo "  ❌ OpenCode plugin installation failed!"
    exit 1
fi

echo

# Step 6: Show summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  ✅ Publish completed!                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Published to: $TARGET_DIR"
echo "║  Installed to: $OPENCODE_PLUGIN_DIR/notify.js"
echo "║"
echo "║  Plugin is ready to use - restart OpenCode to load it."
echo "╚══════════════════════════════════════════════════════════════╝"
