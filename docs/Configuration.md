# Configuration

How to configure OpenCode to use the plugins and MCP servers.

## OpenCode Configuration File

Configuration is stored in `~/.config/opencode/opencode.json`.

## Full Configuration Example

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

## Plugin Configuration

### opencode-notify-plugin

**Purpose:** Sends TTS notifications to VirtualAssistant service.

**Configuration:**

```json
{
  "plugins": {
    "notify": "/home/jirka/virtual-assistant/opencode/plugins/opencode-notify-plugin/dist/index.js"
  }
}
```

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_NOTIFY_URL` | `http://localhost:5055/api/tts/notify` | VirtualAssistant API endpoint |

## MCP Server Configuration

### opencode-hub-plugin

**Purpose:** Agent hub integration for task tracking.

**Configuration:**

```json
{
  "mcpServers": {
    "hub": {
      "type": "local",
      "command": ["node", "/home/jirka/virtual-assistant/opencode/mcp-servers/opencode-hub-plugin/dist/index.js"],
      "enabled": true
    }
  }
}
```

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `HUB_API_URL` | `http://localhost:5055/api/hub` | VirtualAssistant Hub API base URL |

## See Also

- [Deployment Guide](Deployment-Guide) - How to build and deploy
