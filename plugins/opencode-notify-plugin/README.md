# opencode-notify-plugin

OpenCode plugin for notifying VirtualAssistant service. Instead of speaking directly (like the voice plugin), this plugin sends notifications to VirtualAssistant which handles the TTS output.

## Installation

```bash
cd plugins/opencode-notify-plugin
npm install
npm run build
```

The `npm run build` command automatically:
1. Compiles TypeScript to JavaScript
2. Publishes to `~/virtual-assistant/opencode/plugins/opencode-notify-plugin/` (archive location)
3. **Installs to `~/.config/opencode/plugin/notify.js`** (active plugin location)

**Important:** OpenCode loads plugins from `~/.config/opencode/plugin/` directory. The plugin is automatically copied there during build.

## How It Works

OpenCode discovers plugins by scanning the `~/.config/opencode/plugin/` directory. When you run `npm run build`:

1. TypeScript compiles `src/index.ts` → `dist/index.js`
2. `postbuild` hook runs `publish.sh` which:
   - Copies built files to `~/virtual-assistant/opencode/plugins/opencode-notify-plugin/` (published version)
   - Copies `dist/index.js` to `~/.config/opencode/plugin/notify.js` (active plugin)
3. Restart OpenCode to load the updated plugin

**Note:** Symlinks don't work - the plugin file must be copied directly.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_NOTIFY_URL` | `http://localhost:5055/api/tts/notify` | VirtualAssistant API endpoint |

## Usage

The plugin provides a `notify` tool that the AI can use:

```
notify({ text: "Úkol byl dokončen." })
```

## Architecture

```
OpenCode AI → notify tool → VirtualAssistant API → TTS output
```

## License

MIT
