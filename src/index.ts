import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { registerCreateTools } from "./tools/create-tools.js";
import { registerDefaultsTools } from "./tools/defaults-tools.js";
import { registerInspectTool } from "./tools/inspect-tool.js";
import { registerManagementTools } from "./tools/management-tools.js";
import type { JiraToolsConfig } from "./shared/types.js";

const plugin = {
  id: "openclaw-jira-tools",
  name: "Jira Tools",
  version: "1.0.4",
  register(api: OpenClawPluginApi) {
    const rawConfig = ((api as any).pluginConfig || (api as any)?.config?.plugins?.entries?.["openclaw-jira-tools"]?.config || (api as any)?.config?.plugins?.entries?.["jira-tools"]?.config || {}) as JiraToolsConfig;
    if (!rawConfig.server || !rawConfig.email || !rawConfig.token) {
      throw new Error("openclaw-jira-tools requires plugins.entries['openclaw-jira-tools'].config.server/email/token");
    }

    registerCreateTools(api, rawConfig);
    registerDefaultsTools(api);
    registerInspectTool(api, rawConfig);
    registerManagementTools(api, rawConfig);

    console.log("[jira-tools] Registered tools: jira_create_task, jira_create_epic, jira_create_subtask, jira_set_defaults, jira_inspect_project, jira_me, jira_serverinfo, jira_project_list, jira_project_view, jira_issue_list, jira_issue_view, jira_issue_transitions, jira_open, jira_issue_edit, jira_issue_assign, jira_issue_attachment_add, jira_issue_comment_add, jira_issue_clone, jira_issue_delete, jira_issue_watch, jira_issue_move, jira_issue_worklog_add, jira_issue_link, jira_issue_unlink, jira_epic_list, jira_epic_view, jira_epic_add, jira_epic_remove, jira_board_list, jira_sprint_list, jira_sprint_add, jira_sprint_close, jira_release_list");
  },
};

export default plugin;
