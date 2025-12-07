#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// VirtualAssistant API base URL
const API_BASE_URL = process.env.HUB_API_URL || "http://localhost:5055/api/hub";

// Tool definitions
const tools: Tool[] = [
  {
    name: "hub_start",
    description: "Start a new task. Returns messageId for tracking progress and completion.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Task description - what you are starting to work on",
        },
        targetAgent: {
          type: "string",
          description: "Optional target agent identifier (e.g., 'claude', 'user')",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "hub_progress",
    description: "Send a progress update for an ongoing task.",
    inputSchema: {
      type: "object",
      properties: {
        parentMessageId: {
          type: "number",
          description: "Message ID from hub_start",
        },
        content: {
          type: "string",
          description: "Progress update content",
        },
      },
      required: ["parentMessageId", "content"],
    },
  },
  {
    name: "hub_complete",
    description: "Complete a task with a summary.",
    inputSchema: {
      type: "object",
      properties: {
        parentMessageId: {
          type: "number",
          description: "Message ID from hub_start",
        },
        content: {
          type: "string",
          description: "Completion summary - what was accomplished",
        },
      },
      required: ["parentMessageId", "content"],
    },
  },
  {
    name: "hub_check",
    description: "Check for pending messages addressed to this agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          description: "Agent identifier to check messages for (default: 'opencode')",
        },
      },
      required: [],
    },
  },
];

// API helper functions
async function apiPost(endpoint: string, body: object): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

async function apiGet(endpoint: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json();
}

// Tool handlers
async function handleHubStart(args: { content: string; targetAgent?: string }): Promise<string> {
  const result = await apiPost("/start", {
    sourceAgent: "opencode",
    content: args.content,
    targetAgent: args.targetAgent,
  });

  const response = result as { messageId: number };
  return JSON.stringify({
    success: true,
    messageId: response.messageId,
    message: `Task started with ID ${response.messageId}. Use this ID for hub_progress and hub_complete.`,
  });
}

async function handleHubProgress(args: { parentMessageId: number; content: string }): Promise<string> {
  await apiPost("/progress", {
    parentMessageId: args.parentMessageId,
    content: args.content,
  });

  return JSON.stringify({
    success: true,
    message: `Progress update sent for task ${args.parentMessageId}.`,
  });
}

async function handleHubComplete(args: { parentMessageId: number; content: string }): Promise<string> {
  await apiPost("/complete", {
    parentMessageId: args.parentMessageId,
    content: args.content,
  });

  return JSON.stringify({
    success: true,
    message: `Task ${args.parentMessageId} completed.`,
  });
}

async function handleHubCheck(args: { agent?: string }): Promise<string> {
  const agent = args.agent || "opencode";
  const messages = await apiGet(`/pending/${agent}`);

  return JSON.stringify({
    agent,
    messages,
    count: Array.isArray(messages) ? messages.length : 0,
  });
}

// Create and configure the MCP server
const server = new Server(
  {
    name: "opencode-hub-plugin",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "hub_start":
        result = await handleHubStart(args as { content: string; targetAgent?: string });
        break;
      case "hub_progress":
        result = await handleHubProgress(args as { parentMessageId: number; content: string });
        break;
      case "hub_complete":
        result = await handleHubComplete(args as { parentMessageId: number; content: string });
        break;
      case "hub_check":
        result = await handleHubCheck(args as { agent?: string });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: errorMessage }) }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenCode Hub Plugin MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
