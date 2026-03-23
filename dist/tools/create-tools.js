import { JiraClient, mergeDefaults } from "../lib/jira-client.js";
import { JiraDefaultsStore } from "../lib/defaults-store.js";
import { createToolResult, getSessionKey, parseSessionIdentity } from "../lib/runtime.js";
function commonSchema() {
    return {
        type: "object",
        properties: {
            project: { type: "string" },
            summary: { type: "string" },
            body: { type: "string" },
            objective: { type: "string" },
            technicalDetails: { type: "string" },
            dod: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
            links: { type: "array", items: { type: "string" } },
            assigneeEmail: { type: "string" },
            assigneeName: { type: "string" }
        },
        required: ["summary"]
    };
}
export function registerCreateTools(api, rawConfig) {
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
    const defaultsStore = new JiraDefaultsStore();
    async function loadDefaults(ctx) {
        const { agentId, userId } = parseSessionIdentity(getSessionKey(ctx));
        return { ids: { agentId, userId }, defaults: defaultsStore.get(agentId, userId) };
    }
    async function createStandardIssue(kind, input, ctx) {
        const { defaults } = await loadDefaults(ctx);
        const merged = mergeDefaults(input, defaults);
        const project = merged.project || rawConfig.defaultProject || "TAA";
        const issueTypeName = kind === "task" ? client["config"].issueTypeMap.task : kind === "epic" ? client["config"].issueTypeMap.epic : client["config"].issueTypeMap.subtask;
        const assigneeAccountId = await client.resolveAssigneeAccountId(merged.assigneeEmail, merged.assigneeName);
        const parentKey = kind === "subtask" ? input.parent : undefined;
        const objective = merged.objective || (kind === "epic" ? "Mô tả năng lực lớn / phase cần đạt." : kind === "subtask" ? "Mô tả bước thi công nhỏ thuộc issue cha." : "Mô tả mục tiêu kỹ thuật cần thực hiện.");
        const technicalDetails = merged.technicalDetails || (kind === "epic" ? "Phạm vi, ranh giới không làm, KPI, issue con dự kiến." : kind === "subtask" ? "Nêu đầu ra cụ thể cần hoàn tất." : "Liệt kê file, luồng xử lý, input/output, dependency liên quan.");
        const dod = merged.dod || (kind === "epic" ? "Epic hoàn tất khi issue con trọng yếu xong và có comment tổng kết." : kind === "subtask" ? "Hoàn tất đầu ra con và cập nhật lại issue cha." : "Build/Test/Smoke đạt, có bằng chứng, có link Jira bấm được nếu liên quan.");
        const fields = {
            project: { key: project },
            summary: merged.summary,
            description: client.buildDescription(issueTypeName, merged.summary, objective, technicalDetails, dod, merged.links, parentKey),
            issuetype: { name: issueTypeName },
            labels: merged.labels || [],
        };
        if (assigneeAccountId)
            fields.assignee = { accountId: assigneeAccountId };
        if (parentKey)
            fields.parent = { key: parentKey };
        if (kind === "epic")
            fields[client["config"].fieldMappings.epicName] = merged.summary;
        if (kind === "task" && input.epic)
            fields[client["config"].fieldMappings.epicLink] = input.epic;
        if (kind === "task" && input.parentLink)
            fields[client["config"].fieldMappings.parentLink] = input.parentLink;
        const createmeta = await client.getCreateMeta(project, issueTypeName);
        const sanitized = client.sanitizeFields(fields, createmeta);
        const result = await client.createIssue(sanitized);
        return JSON.stringify({ ok: true, kind, key: result.key, url: client.issueUrl(result.key), result }, null, 2);
    }
    api.registerTool({
        name: "jira_create_task",
        label: "Jira Create Task",
        description: "Tạo Jira Task chuẩn cho agent: tự merge defaults theo agent/user, hỗ trợ Epic Link/Parent Link, dựng description tiếng Việt theo template và sanitize fields theo create screen Jira trước khi tạo.",
        parameters: {
            ...commonSchema(),
            properties: {
                ...commonSchema().properties,
                epic: { type: "string", description: "Epic key để gắn Epic Link" },
                parentLink: { type: "string", description: "Parent Link nếu team dùng Advanced Roadmaps" }
            }
        },
        async execute(_id, params, ctx) {
            try {
                return createToolResult(await createStandardIssue("task", params, ctx));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        }
    }, { optional: true });
    api.registerTool({
        name: "jira_create_epic",
        label: "Jira Create Epic",
        description: "Tạo Jira Epic chuẩn cho agent: tự merge defaults, dựng description tiếng Việt theo template và tự fallback/sanitize khi field Epic Name hoặc custom field không có trên create screen.",
        parameters: commonSchema(),
        async execute(_id, params, ctx) {
            try {
                return createToolResult(await createStandardIssue("epic", params, ctx));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        }
    }, { optional: true });
    api.registerTool({
        name: "jira_create_subtask",
        label: "Jira Create Subtask",
        description: "Tạo Jira Subtask chuẩn: bắt buộc có parent issue key, tự merge defaults, dựng description tiếng Việt theo template và liên kết rõ issue cha.",
        parameters: {
            ...commonSchema(),
            properties: {
                ...commonSchema().properties,
                parent: { type: "string", description: "Issue cha" }
            },
            required: ["summary", "parent"]
        },
        async execute(_id, params, ctx) {
            try {
                return createToolResult(await createStandardIssue("subtask", params, ctx));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        }
    }, { optional: true });
}
