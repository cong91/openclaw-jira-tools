import { JiraClient } from "../lib/jira-client.js";
import { createToolResult } from "../lib/runtime.js";
export function registerInspectTool(api, rawConfig) {
    const client = new JiraClient({
        server: rawConfig.server.replace(/\/$/, ""),
        email: rawConfig.email,
        token: rawConfig.token,
        defaultProject: rawConfig.defaultProject || "TAA",
        language: rawConfig.language || "vi",
        requireClickableLinks: rawConfig.requireClickableLinks !== false,
        issueTypeMap: {
            task: rawConfig.issueTypeMap?.task || "Task",
            epic: rawConfig.issueTypeMap?.epic || "Epic",
            subtask: rawConfig.issueTypeMap?.subtask || "Subtask"
        },
        fieldMappings: {
            epicName: rawConfig.fieldMappings?.epicName || "customfield_10011",
            epicLink: rawConfig.fieldMappings?.epicLink || "customfield_10014",
            parentLink: rawConfig.fieldMappings?.parentLink || "customfield_10018"
        }
    });
    api.registerTool({
        name: "jira_inspect_project",
        label: "Jira Inspect Project",
        description: "Inspect Jira project để xem issue types, metadata và create screen fields; dùng khi cần biết field nào Jira screen cho phép set trước khi create/edit issue.",
        parameters: {
            type: "object",
            properties: {
                project: { type: "string" },
                issueType: { type: "string" }
            }
        },
        async execute(_id, params) {
            try {
                const projectKey = params?.project || rawConfig.defaultProject || "TAA";
                const project = await client.getProject(projectKey);
                const issueType = params?.issueType;
                let createmeta = undefined;
                if (issueType)
                    createmeta = await client.getCreateMeta(projectKey, issueType);
                return createToolResult(JSON.stringify({
                    key: project.key,
                    name: project.name,
                    issueTypes: (project.issueTypes || []).map((it) => ({ id: it.id, name: it.name, subtask: it.subtask })),
                    createmeta: createmeta || null
                }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        }
    }, { optional: true });
}
