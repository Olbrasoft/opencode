# OpenCode Hub Plugin

OpenCode plugin for automatic session tracking with VirtualAssistant Hub API.

## Overview

This plugin automatically reports session lifecycle events to the VirtualAssistant Hub API, enabling centralized task tracking across AI agents. It replaces manual tool invocations with event-driven automation.

## Features

### Automatic Event Tracking

| OpenCode Event | Hub API Call | Description |
|----------------|--------------|-------------|
| `session.created` | POST `/api/hub/start` | Initialize task tracking |
| `message.updated` (user) | POST `/api/hub/progress` | Capture user request |
| `message.updated` (assistant) | POST `/api/hub/progress` | Track AI response |
| `session.idle` | POST `/api/hub/complete` | Mark task complete |

### Manual Tools (Backup)

For edge cases where automatic tracking isn't sufficient:

| Tool | Description |
|------|-------------|
| `hub_hub_start` | Manually start a new task |
| `hub_hub_progress` | Send progress update |
| `hub_hub_complete` | Mark task complete |
| `hub_hub_check` | Check pending messages |

## Installation

```bash
# Install dependencies
npm install

# Build and deploy
npm run build
```

The `postbuild` script automatically copies the plugin to:
- `~/virtual-assistant/opencode/plugins/opencode-hub-plugin/`
- `~/.config/opencode/plugin/hub.js`

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_HUB_URL` | `http://localhost:5055/api/hub` | Hub API base URL |

## Logging

Logs are written to `/tmp/opencode-plugin-logs/hub-plugin.log` for debugging:

```bash
tail -f /tmp/opencode-plugin-logs/hub-plugin.log
```

## API Reference

### POST `/api/hub/start`
```json
{
  "sourceAgent": "opencode",
  "content": "Task description",
  "sessionId": "opencode-session-id",
  "targetAgent": "user"
}
```
Response: `{ "messageId": 123 }`

### POST `/api/hub/progress`
```json
{
  "parentMessageId": 123,
  "content": "Progress update"
}
```

### POST `/api/hub/complete`
```json
{
  "parentMessageId": 123,
  "content": "Completion summary"
}
```

### GET `/api/hub/pending/{agent}`
Returns pending messages for the specified agent.

## Development

```bash
# Watch mode for development
npm run watch

# Clean build
npm run clean && npm run build

# Manual publish
npm run publish:local
```

## License

MIT
