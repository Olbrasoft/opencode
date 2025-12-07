# OpenCode Hub Plugin

MCP (Model Context Protocol) plugin for OpenCode integration with VirtualAssistant agent hub.

## Overview

This plugin enables OpenCode to communicate with the VirtualAssistant agent hub for task tracking and inter-agent communication.

## Tools

### hub_start

Start a new task. Returns a `messageId` for tracking progress and completion.

```json
{
  "content": "Implementing feature X",
  "targetAgent": "claude"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "messageId": 123,
  "message": "Task started with ID 123. Use this ID for hub_progress and hub_complete."
}
```

### hub_progress

Send a progress update for an ongoing task.

```json
{
  "parentMessageId": 123,
  "content": "Completed step 1, moving to step 2"
}
```

### hub_complete

Complete a task with a summary.

```json
{
  "parentMessageId": 123,
  "content": "Feature X implemented successfully. Added 3 files, 150 lines of code."
}
```

### hub_check

Check for pending messages addressed to this agent.

```json
{
  "agent": "opencode"  // optional, defaults to "opencode"
}
```

**Response:**
```json
{
  "agent": "opencode",
  "messages": [...],
  "count": 2
}
```

## Installation

```bash
cd ~/mcp-servers/opencode-hub-plugin
npm install
npm run build
```

## Configuration

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcpServers": {
    "hub": {
      "type": "local",
      "command": ["node", "/home/jirka/mcp-servers/opencode-hub-plugin/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Environment Variables

- `HUB_API_URL` - VirtualAssistant API base URL (default: `http://localhost:5055/api/hub`)

## Usage Example

When starting work on a task:

1. Call `hub_start` with task description → get `messageId`
2. Periodically call `hub_progress` with updates
3. When done, call `hub_complete` with summary

The VirtualAssistant will:
- Announce task start via TTS
- Track task progress in database
- Announce task completion via TTS
- Allow user to query "What is OpenCode doing?"

## API Endpoints

The plugin communicates with VirtualAssistant API:

- `POST /api/hub/start` - Start new task
- `POST /api/hub/progress` - Send progress update
- `POST /api/hub/complete` - Complete task
- `GET /api/hub/pending/{agent}` - Get pending messages

## Development

```bash
npm run dev  # Watch mode for development
npm run build  # Production build
npm start  # Run the server
```

## License

MIT
