# OpenCode

OpenCode plugins and MCP servers for VirtualAssistant integration.

## Structure

```
opencode/
├── plugins/                      # OpenCode plugins
│   └── opencode-notify-plugin/   # TTS notification plugin
└── mcp-servers/                  # MCP (Model Context Protocol) servers
    └── opencode-hub-plugin/      # Agent hub integration
```

## Plugins

### opencode-notify-plugin

OpenCode plugin for sending TTS notifications to VirtualAssistant service.

- **Type:** OpenCode Plugin (`@opencode-ai/plugin`)
- **Location:** `plugins/opencode-notify-plugin/`
- **Tool:** `notify({ text: "..." })`
- **API:** `http://localhost:5055/api/tts/notify`

[Read more →](plugins/opencode-notify-plugin/README.md)

## MCP Servers

### opencode-hub-plugin

MCP server for OpenCode integration with VirtualAssistant agent hub.

- **Type:** MCP Server (`@modelcontextprotocol/sdk`)
- **Location:** `mcp-servers/opencode-hub-plugin/`
- **Tools:** `hub_start`, `hub_progress`, `hub_complete`, `hub_check`
- **API:** `http://localhost:5055/api/hub`

[Read more →](mcp-servers/opencode-hub-plugin/README.md)

## What's the Difference?

| | Plugin | MCP Server |
|---|---|---|
| **Architecture** | Runs inside OpenCode process | Runs as separate process |
| **Communication** | Direct function calls | JSON-RPC over stdio |
| **Language** | JavaScript/TypeScript only | Language-agnostic |
| **Isolation** | Shared process | Process isolation |
| **Use case** | Simple, fast integrations | Complex services, external systems |

## Development

Each plugin/server has its own `package.json` and can be developed independently:

```bash
# Notify plugin
cd plugins/opencode-notify-plugin
npm install
npm run build

# Hub MCP server
cd mcp-servers/opencode-hub-plugin
npm install
npm run build
```

## Related Projects

- [VirtualAssistant](https://github.com/Olbrasoft/VirtualAssistant) - Linux virtual assistant with AI integration
- [OpenCode](https://opencode.ai) - AI coding assistant

## License

MIT
