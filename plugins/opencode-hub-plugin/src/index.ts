import type { Plugin } from "@opencode-ai/plugin"
import type { Event } from "@opencode-ai/sdk"
import { tool } from "@opencode-ai/plugin"
import { appendFileSync, mkdirSync, existsSync } from "fs"

// ============================================================================
// Logging Configuration
// ============================================================================

const LOG_DIR = "/tmp/opencode-plugin-logs"
const LOG_FILE = `${LOG_DIR}/hub-plugin.log`

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true })
  } catch {
    // Silent fail
  }
}

function log(message: string): void {
  try {
    const timestamp = new Date().toISOString()
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`)
  } catch {
    // Silent fail - don't break plugin if logging fails
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for Hub API connection
 */
interface HubConfig {
  hubUrl: string
}

/**
 * Session state tracking
 */
interface SessionState {
  messageId: number
  hasStarted: boolean
  lastProcessedMessageId: string | null
}

/**
 * Response from Hub API start endpoint
 */
interface StartResponse {
  messageId: number
}

/**
 * Pending message from Hub API
 */
interface PendingMessage {
  id: number
  sourceAgent: string
  content: string
  messageType: string
  createdAt: string
}

// ============================================================================
// Configuration
// ============================================================================

const defaultConfig: HubConfig = {
  hubUrl: "http://localhost:5055/api/hub",
}

function loadConfig(): HubConfig {
  return {
    hubUrl: process.env.OPENCODE_HUB_URL ?? defaultConfig.hubUrl,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a brief summary from text
 */
function summarize(text: string, maxLength: number = 200): string {
  if (!text) return ""
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength - 3) + "..."
}

// ============================================================================
// Hub Plugin Implementation
// ============================================================================

/**
 * OpenCode Hub Plugin
 *
 * Automatically tracks session lifecycle events and reports them to
 * VirtualAssistant Hub API. Also provides manual tools for edge cases.
 *
 * Events tracked:
 * - session.created → Start task
 * - message.updated (assistant) → Progress update
 * - session.idle → Complete task
 */
export const HubPlugin: Plugin = async () => {
  const config = loadConfig()
  const sessions: Map<string, SessionState> = new Map()

  log(`PLUGIN INIT: hubUrl=${config.hubUrl}`)

  // ==========================================================================
  // API Functions
  // ==========================================================================

  /**
   * Start a new task in Hub API
   */
  async function startTask(
    sessionId: string,
    content: string,
    targetAgent: string = "user"
  ): Promise<number | null> {
    try {
      const response = await fetch(`${config.hubUrl}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAgent: "opencode",
          content,
          sessionId,
          targetAgent,
        }),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = (await response.json()) as StartResponse
        log(`START: sessionId=${sessionId}, messageId=${data.messageId}, content="${summarize(content, 50)}"`)
        return data.messageId
      } else {
        log(`START ERROR: HTTP ${response.status} ${response.statusText}`)
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log(`START ERROR: ${errorMsg}`)
      return null
    }
  }

  /**
   * Send progress update to Hub API
   */
  async function sendProgress(
    parentMessageId: number,
    content: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${config.hubUrl}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentMessageId,
          content,
        }),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        log(`PROGRESS: parentMessageId=${parentMessageId}, content="${summarize(content, 50)}"`)
        return true
      } else {
        log(`PROGRESS ERROR: HTTP ${response.status} ${response.statusText}`)
        return false
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log(`PROGRESS ERROR: ${errorMsg}`)
      return false
    }
  }

  /**
   * Complete a task in Hub API
   */
  async function completeTask(
    parentMessageId: number,
    content: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${config.hubUrl}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentMessageId,
          content,
        }),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        log(`COMPLETE: parentMessageId=${parentMessageId}, content="${summarize(content, 50)}"`)
        return true
      } else {
        log(`COMPLETE ERROR: HTTP ${response.status} ${response.statusText}`)
        return false
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log(`COMPLETE ERROR: ${errorMsg}`)
      return false
    }
  }

  /**
   * Check pending messages from Hub API
   */
  async function checkPending(agent: string = "opencode"): Promise<PendingMessage[]> {
    try {
      const response = await fetch(`${config.hubUrl}/pending/${agent}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = (await response.json()) as PendingMessage[]
        log(`CHECK: agent=${agent}, pending=${data.length}`)
        return data
      } else {
        log(`CHECK ERROR: HTTP ${response.status} ${response.statusText}`)
        return []
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log(`CHECK ERROR: ${errorMsg}`)
      return []
    }
  }

  // ==========================================================================
  // Plugin Return Object
  // ==========================================================================

  return {
    /**
     * Event handler for automatic session tracking
     */
    event: async ({ event }: { event: Event }) => {
      try {
        // Session created - initialize tracking
        if (event.type === "session.created") {
          const sessionId = event.properties.info.id
          log(`EVENT: session.created, sessionId=${sessionId}`)

          const messageId = await startTask(sessionId, "Session started")
          if (messageId !== null) {
            sessions.set(sessionId, {
              messageId,
              hasStarted: true,
              lastProcessedMessageId: null,
            })
          }
        }

        // Message updated - track progress
        if (event.type === "message.updated") {
          const message = event.properties.info
          const sessionId = message.sessionID
          const msgId = message.id
          const role = message.role

          const session = sessions.get(sessionId)

          // Skip if we already processed this message
          if (session && msgId === session.lastProcessedMessageId) {
            return
          }

          // User message - update task description with title if available
          if (role === "user" && session?.messageId) {
            // UserMessage has summary property with title
            const userMsg = message as { summary?: { title?: string } }
            const title = userMsg.summary?.title
            if (title) {
              const summary = summarize(title)
              await sendProgress(session.messageId, `User request: ${summary}`)
              session.lastProcessedMessageId = msgId
              log(`EVENT: message.updated (user), title="${summary}"`)
            }
          }

          // Assistant message - send progress (message completed)
          if (role === "assistant" && session?.messageId) {
            // AssistantMessage has finish and cost properties
            const assistantMsg = message as { finish?: string; cost?: number }
            if (assistantMsg.finish) {
              await sendProgress(session.messageId, `Assistant response completed`)
              session.lastProcessedMessageId = msgId
              log(`EVENT: message.updated (assistant), finish=${assistantMsg.finish}`)
            }
          }
        }

        // Session idle - complete the task
        if (event.type === "session.idle") {
          const sessionId = event.properties.sessionID
          const session = sessions.get(sessionId)
          if (session?.messageId) {
            await completeTask(session.messageId, "Session completed")
            sessions.delete(sessionId)
            log(`EVENT: session.idle, sessionId=${sessionId}`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        log(`EVENT ERROR: ${errorMsg}`)
        // Silent fail - don't break OpenCode
      }
    },

    /**
     * Manual tools for edge cases
     */
    tool: {
      /**
       * Manually start a new task
       */
      hub_hub_start: tool({
        description:
          "Manually start tracking a new task in the Hub. Use this when automatic " +
          "tracking doesn't capture the task correctly. Returns the messageId for " +
          "subsequent progress/complete calls.",
        args: {
          content: tool.schema.string().describe("Description of the task being started"),
          targetAgent: tool.schema
            .string()
            .optional()
            .describe("Target agent (default: 'user')"),
        },
        async execute(args) {
          // Generate a manual session ID
          const manualSessionId = `manual-${Date.now()}`
          const messageId = await startTask(
            manualSessionId,
            args.content,
            args.targetAgent ?? "user"
          )

          if (messageId !== null) {
            sessions.set(manualSessionId, {
              messageId,
              hasStarted: true,
              lastProcessedMessageId: null,
            })
            return `Task started with messageId: ${messageId}`
          } else {
            return "Failed to start task - check Hub API availability"
          }
        },
      }),

      /**
       * Manually send progress update
       */
      hub_hub_progress: tool({
        description:
          "Send a progress update for an active task. Use the parentMessageId " +
          "from the start call.",
        args: {
          parentMessageId: tool.schema
            .number()
            .describe("The messageId from the start call"),
          content: tool.schema.string().describe("Progress update content"),
        },
        async execute(args) {
          const success = await sendProgress(args.parentMessageId, args.content)
          return success
            ? `Progress sent for messageId: ${args.parentMessageId}`
            : "Failed to send progress - check Hub API availability"
        },
      }),

      /**
       * Manually complete a task
       */
      hub_hub_complete: tool({
        description:
          "Mark a task as complete. Use the parentMessageId from the start call.",
        args: {
          parentMessageId: tool.schema
            .number()
            .describe("The messageId from the start call"),
          content: tool.schema.string().describe("Completion summary"),
        },
        async execute(args) {
          const success = await completeTask(args.parentMessageId, args.content)
          return success
            ? `Task completed for messageId: ${args.parentMessageId}`
            : "Failed to complete task - check Hub API availability"
        },
      }),

      /**
       * Check pending messages
       */
      hub_hub_check: tool({
        description:
          "Check for pending messages from the Hub. Returns messages that need " +
          "attention from the specified agent.",
        args: {
          agent: tool.schema
            .string()
            .optional()
            .describe("Agent to check pending for (default: 'opencode')"),
        },
        async execute(args) {
          const pending = await checkPending(args.agent ?? "opencode")
          if (pending.length === 0) {
            return "No pending messages"
          }
          return `${pending.length} pending message(s):\n` +
            pending
              .map((m) => `- [${m.id}] ${m.sourceAgent}: ${m.content}`)
              .join("\n")
        },
      }),
    },
  }
}

// Default export for convenience
export default HubPlugin
