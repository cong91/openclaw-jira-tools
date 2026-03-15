import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { JiraDefaultsStore } from "../lib/defaults-store.js";
import { createToolResult, getSessionKey, parseSessionIdentity } from "../lib/runtime.js";

export function registerDefaultsTools(api: OpenClawPluginApi) {
  const store = new JiraDefaultsStore();

  api.registerTool({
    name: "jira_set_defaults",
    label: "Jira Set Defaults",
    description: "Lưu Jira defaults theo agent/user như default project, assignee, labels, epic và template để agent không quên config ở các lần create/update sau.",
    parameters: {
      type: "object",
      properties: {
        defaultProject: { type: "string" },
        assigneeEmail: { type: "string" },
        assigneeName: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        epicKey: { type: "string" },
        parentLink: { type: "string" },
        templateTask: { type: "string" },
        templateEpic: { type: "string" },
        templateSubtask: { type: "string" }
      }
    },
    async execute(_id: string, params: any, ctx: any) {
      try {
        const { agentId, userId } = parseSessionIdentity(getSessionKey(ctx));
        const next = store.set(agentId, userId, params || {});
        return createToolResult(JSON.stringify({ ok: true, scope: { agentId, userId }, defaults: next }, null, 2));
      } catch (e) {
        return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
      }
    }
  }, { optional: true });
}
