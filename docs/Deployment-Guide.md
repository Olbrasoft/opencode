# Deployment Guide

This guide explains how to build and deploy OpenCode plugins and MCP servers.

## Automatic Deployment

All projects use **automatic deployment after build**. When you run `npm run build`, the compiled artifacts are automatically published to the production directory.

### How It Works

Each project uses npm **postbuild lifecycle hooks**:

```json
"scripts": {
  "build": "tsc",
  "postbuild": "./publish.sh"
}
```

**Workflow:**
1. Run `npm run build`
2. TypeScript compiles `src/*.ts` → `dist/*.js`
3. npm automatically executes `postbuild` hook
4. `publish.sh` copies files to production directory

### Production Directories

| Project | Published To |
|---------|-------------|
| opencode-notify-plugin | `~/virtual-assistant/opencode/plugins/opencode-notify-plugin/` |
| opencode-hub-plugin | `~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/` |

## Commands

### Build Individual Project

```bash
# Notify Plugin
cd plugins/opencode-notify-plugin
npm run build          # Build + auto-publish ✅

# Hub MCP Server
cd mcp-servers/opencode-hub-plugin
npm run build          # Build + auto-publish ✅
```

### Deploy All Projects

```bash
# From repository root
./deploy-all.sh        # Builds and publishes all projects
```

### Manual Publish (Without Build)

If you only want to copy existing `dist/` without rebuilding:

```bash
npm run publish:local
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

**Size:** ~10 KB (just JS files)

### opencode-hub-plugin

```
~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/
├── dist/
│   ├── index.js       # Compiled JavaScript
│   ├── index.d.ts     # TypeScript definitions
│   └── *.map          # Source maps
├── node_modules/      # Production dependencies (MCP SDK)
│   └── @modelcontextprotocol/
├── package.json       # Metadata
└── README.md          # Documentation
```

**Size:** ~2 MB (includes MCP SDK dependencies)

## Development Workflow

```bash
# 1. Make changes to source code
vim src/index.ts

# 2. Build (automatically publishes)
npm run build

# 3. Changes are now live in production directory
```

## Watch Mode (Development)

For active development, use watch mode:

```bash
npm run watch          # Watches for changes, rebuilds automatically
```

**Note:** Watch mode does NOT auto-publish on every change. When ready to publish, run `npm run build` once.

## First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/Olbrasoft/opencode.git
cd opencode

# 2. Install dependencies for each project
cd plugins/opencode-notify-plugin
npm install
cd ../../mcp-servers/opencode-hub-plugin
npm install

# 3. Build all projects (auto-publishes)
cd ../..
./deploy-all.sh
```

## Verification

After deployment, verify files exist:

```bash
# Check notify plugin
ls -la ~/virtual-assistant/opencode/plugins/opencode-notify-plugin/dist/index.js

# Check hub MCP server
ls -la ~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/dist/index.js

# Check MCP SDK is installed
ls -la ~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/node_modules/@modelcontextprotocol/
```

## Troubleshooting

### "Permission denied" when running publish.sh

Make the script executable:

```bash
chmod +x publish.sh
```

### Published files not updating

1. Check if build succeeded:
   ```bash
   ls -la dist/
   ```

2. Manually run publish:
   ```bash
   npm run publish:local
   ```

3. Check target directory:
   ```bash
   ls -la ~/virtual-assistant/opencode/
   ```

### MCP server missing dependencies

The publish script automatically runs `npm install --production` in the target directory to install runtime dependencies.

If it fails:

```bash
cd ~/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin
npm install --production
```

### Build fails with TypeScript errors

```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
npm run clean
npm install
npm run build
```

## Next Steps

After deployment:

1. Configure OpenCode: See [Configuration](Configuration)
2. Restart OpenCode to load plugins
3. Test functionality

## See Also

- [Configuration](Configuration) - How to configure OpenCode
- [Plugin Development](Plugin-Development) - Creating new plugins
- [MCP Server Development](MCP-Server-Development) - Creating new MCP servers
