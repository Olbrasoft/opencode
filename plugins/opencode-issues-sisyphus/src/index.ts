import type { Plugin } from "@opencode-ai/plugin"
import { ISSUES_SISYPHUS_SYSTEM_PROMPT } from "./prompt"
import { ISSUES_SISYPHUS_PERMISSION } from "./permission"

export const IssuesSisyphusPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      const defaultModel = config.model as string | undefined
      
      ;(config as Record<string, unknown>).agent = {
        ...((config.agent ?? {}) as Record<string, unknown>),
        "Issues-Sisyphus": {
          model: defaultModel,
          mode: "primary",
          prompt: ISSUES_SISYPHUS_SYSTEM_PROMPT,
          permission: ISSUES_SISYPHUS_PERMISSION,
          description: "Planner-Sisyphus + GitHub issues + internet search",
          color: "#32CD32",
        },
      }
    },
  }
}

export default IssuesSisyphusPlugin
