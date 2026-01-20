import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { appendFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

const LOG_DIR = "/tmp/opencode-plugin-logs"
const LOG_FILE = `${LOG_DIR}/notify-plugin.log`

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true })
  } catch {
    // Silent fail
  }
}

function logToFile(message: string): void {
  try {
    const timestamp = new Date().toISOString()
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`)
  } catch {
    // Silent fail
  }
}

/**
 * Model information from OpenCode storage
 */
interface ModelInfo {
  provider: string
  model: string
}

/**
 * Reads the most recent message from OpenCode storage to determine
 * the currently active LLM model and provider.
 */
function getCurrentModel(): ModelInfo | null {
  const storageDir = join(homedir(), ".local/share/opencode/storage/message")

  try {
    if (!existsSync(storageDir)) {
      return null
    }

    const sessionDirs = readdirSync(storageDir)

    let latestFile: string | null = null
    let latestMtime = 0

    // Find the most recent message file across all sessions
    for (const sessionDir of sessionDirs) {
      const sessionPath = join(storageDir, sessionDir)
      const stat = statSync(sessionPath)
      if (!stat.isDirectory()) continue

      const files = readdirSync(sessionPath)
      for (const file of files) {
        if (!file.endsWith(".json")) continue
        const filePath = join(sessionPath, file)
        const fileStat = statSync(filePath)
        if (fileStat.mtimeMs > latestMtime) {
          latestMtime = fileStat.mtimeMs
          latestFile = filePath
        }
      }
    }

    if (!latestFile) return null

    const content = readFileSync(latestFile, "utf-8")
    const message = JSON.parse(content)

    // Extract provider and model from message
    const provider = message.model?.providerID || message.providerID
    const model = message.model?.modelID || message.modelID

    if (provider && model) {
      logToFile(`Detected model: ${provider}/${model}`)
      return { provider, model }
    }
  } catch (error) {
    logToFile(`Error getting current model: ${error}`)
  }

  return null
}

/**
 * Configuration for the Notify service
 */
interface NotifyConfig {
  /** VirtualAssistant API endpoint for notifications */
  notifyUrl: string
}

/**
 * Default configuration
 */
const defaultConfig: NotifyConfig = {
  notifyUrl: "http://localhost:5055/api/notifications",
}

/**
 * Load configuration from environment or use defaults
 */
function loadConfig(): NotifyConfig {
  return {
    notifyUrl: process.env.OPENCODE_NOTIFY_URL ?? defaultConfig.notifyUrl,
  }
}

/**
 * Response from VirtualAssistant notify endpoint
 */
interface NotifyResponse {
  success: boolean
  message: string
  text: string
  source: string
}

/**
 * Request body for VirtualAssistant notify endpoint
 */
interface NotifyRequest {
  text: string
  source: string
  issueIds?: number[]
  providerName?: string
  modelName?: string
}

/**
 * OpenCode Notify Plugin
 *
 * Provides notification functionality for OpenCode through VirtualAssistant.
 * Instead of speaking directly, this plugin notifies VirtualAssistant
 * which handles the TTS output.
 *
 * @example
 * // The AI can use the notify tool like this:
 * // notify({ text: "Úkol byl dokončen." })
 */
export const NotifyPlugin: Plugin = async () => {
  const config = loadConfig()

  logToFile(`PLUGIN INIT: notifyUrl=${config.notifyUrl}`)

  /**
   * Send notification to VirtualAssistant
   * Uses source: "opencode" for voice differentiation
   * Automatically detects and sends current LLM model info
   */
  async function notify(text: string, issueIds?: number[]): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      // Automatically detect current model from OpenCode storage
      const currentModel = getCurrentModel()

      const requestBody: NotifyRequest = { text, source: "opencode" }
      if (issueIds && issueIds.length > 0) {
        requestBody.issueIds = issueIds
      }

      // Add LLM tracking info if detected
      if (currentModel) {
        requestBody.providerName = currentModel.provider
        requestBody.modelName = currentModel.model
      }

      const response = await fetch(config.notifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        const data = (await response.json()) as NotifyResponse
        const modelInfo = currentModel ? `${currentModel.provider}/${currentModel.model}` : "unknown"
        logToFile(`Notification sent (model: ${modelInfo}): ${text.substring(0, 100)}`)
        return { success: true, model: modelInfo }
      } else {
        const errorMsg = `HTTP ${response.status} ${response.statusText}`
        logToFile(`API error: ${errorMsg}`)
        return { success: false, error: errorMsg }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logToFile(`Notification error: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  return {
    /**
     * Custom tools provided by this plugin
     */
    tool: {
      /**
       * Notify VirtualAssistant with text (for TTS output)
       */
      notify: tool({
        description:
          "Notify VirtualAssistant with text to speak aloud. Use this for voice confirmations, " +
          "task acknowledgments, and summaries. Text should be in Czech language, " +
          "natural and conversational. Keep it brief (1-3 sentences). " +
          "Optionally include related GitHub issue IDs for context.",
        args: {
          text: tool.schema.string().describe("The text to notify (Czech language preferred)"),
          issueIds: tool.schema.array(tool.schema.number()).optional().describe(
            "Optional array of GitHub issue numbers related to this notification"
          ),
        },
        async execute(args) {
          const result = await notify(args.text, args.issueIds)
          if (result.success) {
            const issueInfo = args.issueIds?.length ? ` [issues: ${args.issueIds.join(", ")}]` : ""
            const modelInfo = result.model ? ` [model: ${result.model}]` : ""
            return `„${args.text}"${issueInfo}${modelInfo}`
          } else {
            return `[Notify error: ${result.error}] „${args.text}"`
          }
        },
      }),
    },
  }
}

// Default export for convenience
export default NotifyPlugin
