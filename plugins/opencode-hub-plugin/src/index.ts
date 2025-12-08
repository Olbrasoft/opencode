import type { Plugin } from "@opencode-ai/plugin"
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

interface HubConfig {
  hubUrl: string
}

interface SessionState {
  messageId: number
  hasStarted: boolean
  lastProcessedMessageId: string | null
  // Track actual conversation content
  userMessages: string[]
  assistantText: string
  toolsUsed: Set<string>
  messageCount: number
}

interface StartResponse {
  messageId: number
}

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

function summarize(text: string, maxLength: number = 200): string {
  if (!text) return ""
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength - 3) + "..."
}

// ============================================================================
// API Functions (module level)
// ============================================================================

const config = loadConfig()
const sessions: Map<string, SessionState> = new Map()

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

// ============================================================================
// Hub Plugin Implementation
// ============================================================================

log(`PLUGIN LOAD: hubUrl=${config.hubUrl}`)

export const HubPlugin: Plugin = async ({ client }) => {
  log(`PLUGIN INIT: client available=${!!client}`)

  return {
    event: async ({ event }: { event: any }) => {
      try {
        // Log every event for debugging
        log(`EVENT RECEIVED: type=${event.type}`)

        // Session created - initialize tracking
        if (event.type === "session.created") {
          const sessionId = (event.properties as any).info?.id
          log(`EVENT: session.created, sessionId=${sessionId}`)

          if (sessionId) {
            const messageId = await startTask(sessionId, "New session started")
            if (messageId !== null) {
              sessions.set(sessionId, {
                messageId,
                hasStarted: true,
                lastProcessedMessageId: null,
                userMessages: [],
                assistantText: "",
                toolsUsed: new Set<string>(),
                messageCount: 0,
              })
            }
          }
        }

        // Message part updated - capture actual text content
        if (event.type === "message.part.updated") {
          const part = (event.properties as any).part
          const sessionId = part?.sessionID
          const partType = part?.type

          const session = sessions.get(sessionId)
          if (!session) return

          // Capture text content
          if (partType === "text" && part.text) {
            // Check if this is a user message (has no parentID) or assistant
            // We accumulate assistant text
            session.assistantText += part.text
            log(`PART: text captured, length=${part.text.length}`)
          }

          // Capture tool usage
          if (partType === "tool" && part.tool) {
            session.toolsUsed.add(part.tool)
            log(`PART: tool used=${part.tool}`)
          }
        }

        // Message updated - track progress
        if (event.type === "message.updated") {
          const info = (event.properties as any).info
          const sessionId = info?.sessionID
          const msgId = info?.id
          const role = info?.role

          log(`EVENT: message.updated, role=${role}, sessionId=${sessionId}`)

          // Auto-create session from first user message if not exists
          if (sessionId && !sessions.has(sessionId) && role === "user") {
            // Try to get actual user input from summary or title
            const title = info?.summary?.title || info?.summary?.body
            const content = title ? summarize(title, 200) : "New conversation"
            log(`AUTO-CREATE SESSION: sessionId=${sessionId}, content="${content}"`)

            const messageId = await startTask(sessionId, content)
            if (messageId !== null) {
              sessions.set(sessionId, {
                messageId,
                hasStarted: true,
                lastProcessedMessageId: msgId,
                userMessages: [content],
                assistantText: "",
                toolsUsed: new Set<string>(),
                messageCount: 1,
              })
              log(`SESSION CREATED: sessionId=${sessionId}, messageId=${messageId}`)
            }
            return
          }

          const session = sessions.get(sessionId)

          // Skip if we already processed this message
          if (session && msgId === session.lastProcessedMessageId) {
            return
          }

          // User message - capture and send actual content
          if (role === "user" && session?.messageId) {
            session.messageCount++
            const title = info?.summary?.title || info?.summary?.body
            if (title) {
              const userText = summarize(title, 300)
              session.userMessages.push(userText)
              await sendProgress(session.messageId, `User: ${userText}`)
              session.lastProcessedMessageId = msgId
              log(`EVENT: message.updated (user), text="${summarize(userText, 50)}"`)
            }
          }

          // Assistant message - send progress with actual content when completed
          if (role === "assistant" && session?.messageId) {
            session.messageCount++
            if (info?.finish) {
              // Build response summary with tools used
              let responseContent = ""

              // Add accumulated text content (truncated)
              if (session.assistantText) {
                responseContent = summarize(session.assistantText, 400)
              }

              // Add tools used
              if (session.toolsUsed.size > 0) {
                const toolsList = Array.from(session.toolsUsed).join(", ")
                responseContent += responseContent
                  ? ` [Tools: ${toolsList}]`
                  : `Used tools: ${toolsList}`
              }

              if (!responseContent) {
                responseContent = "Response completed"
              }

              await sendProgress(session.messageId, `Assistant: ${responseContent}`)

              // Reset for next response
              session.assistantText = ""
              session.lastProcessedMessageId = msgId
              log(`EVENT: message.updated (assistant), finish=${info.finish}, tools=${session.toolsUsed.size}`)
            }
          }
        }

        // Session idle - complete the task with summary
        if (event.type === "session.idle") {
          const sessionId = (event.properties as any).sessionID
          log(`EVENT: session.idle, sessionId=${sessionId}`)

          const session = sessions.get(sessionId)
          if (session?.messageId) {
            // Build completion summary
            const parts: string[] = []

            // Add message count
            if (session.messageCount > 0) {
              parts.push(`${session.messageCount} messages`)
            }

            // Add tools used summary
            if (session.toolsUsed.size > 0) {
              const toolsList = Array.from(session.toolsUsed).slice(0, 5).join(", ")
              const moreTools = session.toolsUsed.size > 5 ? ` +${session.toolsUsed.size - 5} more` : ""
              parts.push(`tools: ${toolsList}${moreTools}`)
            }

            // Add last user message as context
            if (session.userMessages.length > 0) {
              const lastUserMsg = session.userMessages[session.userMessages.length - 1]
              parts.push(`last request: "${summarize(lastUserMsg, 100)}"`)
            }

            const completionContent = parts.length > 0
              ? `Session completed (${parts.join(", ")})`
              : "Session completed"

            await completeTask(session.messageId, completionContent)
            sessions.delete(sessionId)
            log(`SESSION COMPLETE: messages=${session.messageCount}, tools=${session.toolsUsed.size}`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        log(`EVENT ERROR: ${errorMsg}`)
        // Silent fail - don't break OpenCode
      }
    },

    tool: {
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
              userMessages: [args.content],
              assistantText: "",
              toolsUsed: new Set<string>(),
              messageCount: 1,
            })
            return `Task started with messageId: ${messageId}`
          } else {
            return "Failed to start task - check Hub API availability"
          }
        },
      }),

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

export default HubPlugin
