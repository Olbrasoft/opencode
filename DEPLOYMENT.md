# Deployment Guide

This repository uses automatic deployment after build. When you run `npm run build`, the built artifacts are automatically published to the production directory.

## How It Works

### Automatic Deployment

Each project uses npm **lifecycle hooks** to automatically publish after build:

```json
"scripts": {
  "build": "tsc",
  "postbuild": "./publish.sh"
}
```

When you run `npm run build`:
1. TypeScript compiles `src/*.ts` → `dist/*.js`
2. **Automatically** runs `postbuild` hook → executes `./publish.sh`
3. Files are copied to production directory

### Production Directories

| Project | Published To |
|---------|-------------|
| opencode-notify-plugin | `~/virtual-assistant/opencode/plugins/opencode-notify-plugin/` |
| opencode-hub-plugin | `~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/` |

## Commands

### Individual Projects

```bash
# Notify Plugin
cd plugins/opencode-notify-plugin
npm run build          # Build + auto-publish

# Hub MCP Server
cd mcp-servers/opencode-hub-plugin
npm run build          # Build + auto-publish
```

### Deploy All Projects

```bash
# From repository root
./deploy-all.sh        # Builds and publishes all projects
```

## What Gets Published

### opencode-notify-plugin
```
~/virtual-assistant/opencode/plugins/opencode-notify-plugin/
├── dist/
│   ├── index.js       # Compiled JavaScript
│   ├── index.d.ts     # TypeScript definitions
│   └── *.map          # Source maps
├── package.json       # Metadata
└── README.md          # Documentation
```

### opencode-hub-plugin
```
~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/
├── dist/
│   ├── index.js       # Compiled JavaScript
│   ├── index.d.ts     # TypeScript definitions
│   └── *.map          # Source maps
├── node_modules/      # Production dependencies (MCP SDK)
├── package.json       # Metadata
└── README.md          # Documentation
```

## Manual Publish (Without Build)

If you only want to publish existing `dist/` without rebuilding:

```bash
npm run publish:local
```

## Development Workflow

```bash
# 1. Make changes to src/index.ts
vim src/index.ts

# 2. Build (automatically publishes)
npm run build

# 3. Changes are now live in production directory
```

## Watch Mode

For development, use watch mode (does NOT auto-publish on every change):

```bash
npm run watch          # Watches for changes, rebuilds automatically
```

When ready to publish, run `npm run build` once.

## Troubleshooting

### "Permission denied" when running publish.sh

```bash
chmod +x publish.sh
```

### Published files not updating

1. Check if build succeeded: `ls -la dist/`
2. Manually run publish: `npm run publish:local`
3. Check target directory: `ls -la ~/virtual-assistant/opencode/`

### MCP server missing dependencies

The publish script automatically runs `npm install --production` in the target directory to install runtime dependencies (e.g., `@modelcontextprotocol/sdk`).

## Configuration

After deployment, update OpenCode configuration:

**~/.config/opencode/opencode.json:**

```json
{
  "plugins": {
    "notify": "/home/jirka/virtual-assistant/opencode/plugins/opencode-notify-plugin/dist/index.js"
  },
  "mcpServers": {
    "hub": {
      "type": "local",
      "command": ["node", "/home/jirka/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/dist/index.js"],
      "enabled": true
    }
  }
}
```

Restart OpenCode to load the plugins.
