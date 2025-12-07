#!/bin/bash
set -e

# OpenCode Repository - Deploy All Script
# Builds and publishes all plugins and MCP servers

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              OpenCode - Deploy All Projects                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# Deploy notify plugin
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1/2: OpenCode Notify Plugin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
cd "$REPO_ROOT/plugins/opencode-notify-plugin"
npm run deploy
if [ $? -ne 0 ]; then
    echo "❌ Notify plugin deployment failed!"
    exit 1
fi
echo

# Deploy hub MCP server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  2/2: OpenCode Hub MCP Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
cd "$REPO_ROOT/mcp-servers/opencode-hub-plugin"
npm run deploy
if [ $? -ne 0 ]; then
    echo "❌ Hub MCP server deployment failed!"
    exit 1
fi
echo

# Summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ All deployments completed!                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Published to: ~/virtual-assistant/opencode/"
echo "║"
echo "║  Plugins:"
echo "║    • opencode-notify-plugin"
echo "║"
echo "║  MCP Servers:"
echo "║    • opencode-hub-plugin"
echo "║"
echo "║  Next steps:"
echo "║    1. Update ~/.config/opencode/opencode.json"
echo "║    2. Restart OpenCode to load plugins"
echo "╚══════════════════════════════════════════════════════════════╝"
