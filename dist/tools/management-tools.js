import { JiraClient } from "../lib/jira-client.js";
import { createToolResult } from "../lib/runtime.js";
function normalizeJiraError(error) {
    const message = error instanceof Error ? error.message : String(error);
    let status;
    let payload = undefined;
    const m = message.match(/^(\d{3}):\s*(.*)$/s);
    if (m) {
        status = Number(m[1]);
        try {
            payload = JSON.parse(m[2]);
        }
        catch {
            payload = { raw: m[2] };
        }
    }
    const text = JSON.stringify(payload || {}).toLowerCase();
    let category = "unknown_error";
    if (status === 401)
        category = "auth_error";
    else if (status === 403)
        category = "permission_error";
    else if (status === 404)
        category = "issue_not_found";
    else if (status === 400)
        category = text.includes("transition") ? "transitions_unavailable" : "bad_request";
    return { category, status, message, payload };
}
function formatTransitions(issueKey, issue, transitionsData) {
    const transitions = Array.isArray(transitionsData?.transitions) ? transitionsData.transitions : [];
    return {
        issueKey,
        currentStatus: issue?.fields?.status?.name || null,
        transitions: transitions.map((t) => ({
            id: String(t.id),
            name: t.name || null,
            to: {
                name: t.to?.name || null,
                statusCategory: t.to?.statusCategory?.key || t.to?.statusCategory?.name || null,
                isDoneCategory: (t.to?.statusCategory?.key || "") === "done",
            },
            hasScreen: Boolean(t.hasScreen),
            raw: t,
        })),
    };
}
function makeClient(rawConfig) {
    return new JiraClient({
        server: rawConfig.server.replace(/\/$/, ""),
        email: rawConfig.email,
        token: rawConfig.token,
        defaultProject: rawConfig.defaultProject || "TAA",
        language: rawConfig.language || "vi",
        requireClickableLinks: rawConfig.requireClickableLinks !== false,
        issueTypeMap: {
            task: rawConfig.issueTypeMap?.task || "Task",
            epic: rawConfig.issueTypeMap?.epic || "Epic",
            subtask: rawConfig.issueTypeMap?.subtask || "Subtask",
        },
        fieldMappings: {
            epicName: rawConfig.fieldMappings?.epicName || "customfield_10011",
            epicLink: rawConfig.fieldMappings?.epicLink || "customfield_10014",
            parentLink: rawConfig.fieldMappings?.parentLink || "customfield_10018",
        },
    });
}
export function registerManagementTools(api, rawConfig) {
    const client = makeClient(rawConfig);
    api.registerTool({
        name: "jira_me",
        label: "Jira Me",
        description: "Hiển thị thông tin Jira user hiện tại để agent biết account đang thao tác, accountId và ngữ cảnh auth/runtime.",
        parameters: { type: "object", properties: {} },
        async execute() {
            try {
                const data = await client.request(`/rest/api/3/myself`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_serverinfo",
        label: "Jira Server Info",
        description: "Hiển thị thông tin Jira instance/server để xác minh đang thao tác đúng Jira site, version và deployment context.",
        parameters: { type: "object", properties: {} },
        async execute() {
            try {
                const data = await client.request(`/rest/api/3/serverInfo`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_project_list",
        label: "Jira Project List",
        description: "Liệt kê các Jira project mà account hiện tại có quyền truy cập; dùng khi cần chọn đúng project key trước khi create/list issue.",
        parameters: { type: "object", properties: {} },
        async execute() {
            try {
                const data = await client.request(`/rest/api/3/project`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_project_view",
        label: "Jira Project View",
        description: "Xem chi tiết một Jira project, gồm metadata project và issue types khả dụng trong project đó.",
        parameters: { type: "object", properties: { project: { type: "string" } }, required: ["project"] },
        async execute(_id, params) {
            try {
                const data = await client.getProject(params.project);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_list",
        label: "Jira Issue List",
        description: "Liệt kê issues theo JQL hoặc filter project/status/assignee; dùng khi cần tra backlog, tìm issue tồn tại hoặc kiểm tra trạng thái trước khi thao tác tiếp.",
        parameters: {
            type: "object",
            properties: {
                jql: { type: "string" },
                project: { type: "string" },
                assignee: { type: "string" },
                status: { type: "string" },
                maxResults: { type: "number" },
            },
        },
        async execute(_id, params) {
            try {
                const clauses = [];
                if (params?.project)
                    clauses.push(`project=${params.project}`);
                if (params?.assignee)
                    clauses.push(`assignee=\"${params.assignee}\"`);
                if (params?.status)
                    clauses.push(`status=\"${params.status}\"`);
                const jql = params?.jql || clauses.join(" AND ") || `project=${rawConfig.defaultProject || "TAA"}`;
                const q = new URLSearchParams({ jql, maxResults: String(params?.maxResults || 50), fields: "summary,status,assignee,issuetype,parent,labels,updated" });
                const data = await client.request(`/rest/api/3/search/jql?${q.toString()}`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_view",
        label: "Jira Issue View",
        description: "Xem chi tiết một issue Jira, gồm fields, links, parent/epic và metadata liên quan để agent có đủ context trước khi edit/comment/move.",
        parameters: { type: "object", properties: { issueKey: { type: "string" } }, required: ["issueKey"] },
        async execute(_id, params) {
            try {
                const data = await client.getIssue(params.issueKey);
                let availableTransitions = [];
                try {
                    const transitionsData = await client.getIssueTransitions(params.issueKey);
                    availableTransitions = formatTransitions(params.issueKey, data, transitionsData).transitions;
                }
                catch {
                    availableTransitions = [];
                }
                return createToolResult(JSON.stringify({ ...data, availableTransitions }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_transitions",
        label: "Jira Issue Transitions",
        description: "Liệt kê các transitions khả dụng của một issue để agent discover transition id hợp lệ trước khi move issue.",
        parameters: { type: "object", properties: { issueKey: { type: "string" } }, required: ["issueKey"] },
        async execute(_id, params) {
            try {
                const issue = await client.getIssue(params.issueKey);
                const transitionsData = await client.getIssueTransitions(params.issueKey);
                const result = formatTransitions(params.issueKey, issue, transitionsData);
                if (result.transitions.length === 0) {
                    return createToolResult(JSON.stringify({
                        ...result,
                        ok: true,
                        message: "Issue hiện không có transition khả dụng.",
                    }, null, 2));
                }
                return createToolResult(JSON.stringify({ ok: true, ...result }, null, 2));
            }
            catch (e) {
                const err = normalizeJiraError(e);
                return createToolResult(JSON.stringify({
                    ok: false,
                    issueKey: params.issueKey,
                    error: err.category,
                    status: err.status || null,
                    message: err.message,
                    details: err.payload || null,
                }, null, 2), true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_open",
        label: "Jira Open",
        description: "Trả về URL mở issue trên Jira giống hành vi jira open; dùng khi cần gửi link bấm được thay vì mở browser cục bộ.",
        parameters: { type: "object", properties: { issueKey: { type: "string" } }, required: ["issueKey"] },
        async execute(_id, params) {
            try {
                return createToolResult(JSON.stringify({ ok: true, issueKey: params.issueKey, url: client.issueUrl(params.issueKey) }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_edit",
        label: "Jira Issue Edit",
        description: "Sửa summary, description hoặc labels của issue; dùng khi cần cập nhật nội dung issue mà không tạo issue mới.",
        parameters: {
            type: "object",
            properties: {
                issueKey: { type: "string" },
                summary: { type: "string" },
                description: { type: "string" },
                labels: { type: "array", items: { type: "string" } },
            },
            required: ["issueKey"],
        },
        async execute(_id, params) {
            try {
                const fields = {};
                if (params.summary)
                    fields.summary = params.summary;
                if (params.description)
                    fields.description = client.buildDescription("Update", params.summary || params.issueKey, params.description, params.description, params.description, []);
                if (params.labels)
                    fields.labels = params.labels;
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}`, { method: "PUT", body: JSON.stringify({ fields }) });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_assign",
        label: "Jira Issue Assign",
        description: "Assign issue cho user theo email hoặc display name; tool sẽ resolve accountId trước khi gọi Jira API.",
        parameters: {
            type: "object",
            properties: {
                issueKey: { type: "string" },
                assigneeEmail: { type: "string" },
                assigneeName: { type: "string" },
            },
            required: ["issueKey"],
        },
        async execute(_id, params) {
            try {
                const accountId = await client.resolveAssigneeAccountId(params.assigneeEmail, params.assigneeName);
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}/assignee`, { method: "PUT", body: JSON.stringify({ accountId: accountId || null }) });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_attachment_add",
        label: "Jira Issue Attachment Add",
        description: "Upload file thật lên Jira issue qua Attachment API; dùng khi cần đính kèm artifact/bằng chứng thay vì chỉ comment path.",
        parameters: {
            type: "object",
            properties: {
                issueKey: { type: "string" },
                filePath: { type: "string" },
                comment: { type: "string" }
            },
            required: ["issueKey", "filePath"]
        },
        async execute(_id, params) {
            try {
                const upload = await client.uploadAttachment(params.issueKey, params.filePath);
                if (params.comment) {
                    const payload = {
                        body: {
                            type: "doc",
                            version: 1,
                            content: [{ type: "paragraph", content: [{ type: "text", text: params.comment }] }],
                        },
                    };
                    await client.request(`/rest/api/3/issue/${params.issueKey}/comment`, { method: "POST", body: JSON.stringify(payload) });
                }
                return createToolResult(JSON.stringify({ ok: true, issueKey: params.issueKey, uploaded: upload, url: client.issueUrl(params.issueKey) }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_comment_add",
        label: "Jira Issue Comment Add",
        description: "Thêm comment vào issue bằng tiếng Việt; dùng cho cập nhật tiến độ, bằng chứng, blocker hoặc note nội bộ.",
        parameters: { type: "object", properties: { issueKey: { type: "string" }, body: { type: "string" }, internal: { type: "boolean" } }, required: ["issueKey", "body"] },
        async execute(_id, params) {
            try {
                const payload = {
                    body: {
                        type: "doc",
                        version: 1,
                        content: [{ type: "paragraph", content: [{ type: "text", text: params.body }] }],
                    },
                };
                if (params.internal)
                    payload.properties = [{ key: "sd.public.comment", value: { internal: true } }];
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}/comment`, { method: "POST", body: JSON.stringify(payload) });
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_clone",
        label: "Jira Issue Clone",
        description: "Clone issue tương tự jira-cli clone và cho phép override summary, assignee, labels, parent, priority hoặc replace text trong summary/body.",
        parameters: {
            type: "object",
            properties: {
                issueKey: { type: "string" },
                parent: { type: "string" },
                summary: { type: "string" },
                priority: { type: "string" },
                assigneeEmail: { type: "string" },
                assigneeName: { type: "string" },
                labels: { type: "array", items: { type: "string" } },
                replace: { type: "array", items: { type: "string" }, description: "Format search:replace" }
            },
            required: ["issueKey"],
        },
        async execute(_id, params) {
            try {
                const source = await client.getIssue(params.issueKey);
                const fields = source.fields || {};
                let summary = params.summary || fields.summary || `Clone of ${params.issueKey}`;
                let bodyText = JSON.stringify(fields.description || {});
                for (const pair of params.replace || []) {
                    const [search, ...rest] = String(pair).split(":");
                    const repl = rest.join(":");
                    if (search) {
                        summary = summary.split(search).join(repl);
                        bodyText = bodyText.split(search).join(repl);
                    }
                }
                const assigneeAccountId = await client.resolveAssigneeAccountId(params.assigneeEmail, params.assigneeName);
                const cloneFields = {
                    project: fields.project,
                    summary,
                    issuetype: { id: fields.issuetype?.id },
                    description: fields.description,
                    labels: params.labels || fields.labels || [],
                };
                if (assigneeAccountId)
                    cloneFields.assignee = { accountId: assigneeAccountId };
                if (params.parent)
                    cloneFields.parent = { key: params.parent };
                if (params.priority)
                    cloneFields.priority = { name: params.priority };
                const createMeta = await client.getCreateMeta(fields.project?.key || rawConfig.defaultProject || "TAA", fields.issuetype?.name || "Task");
                const sanitized = client.sanitizeFields(cloneFields, createMeta);
                const data = await client.createIssue(sanitized);
                return createToolResult(JSON.stringify({ ok: true, key: data.key, url: client.issueUrl(data.key), result: data }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_delete",
        label: "Jira Issue Delete",
        description: "Xóa issue Jira khi user yêu cầu rõ ràng hoặc cần cleanup issue test; đây là thao tác có side effect mạnh.",
        parameters: { type: "object", properties: { issueKey: { type: "string" } }, required: ["issueKey"] },
        async execute(_id, params) {
            try {
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}`, { method: "DELETE" });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_watch",
        label: "Jira Issue Watch",
        description: "Thêm watcher vào issue theo email hoặc display name để người liên quan theo dõi thay đổi của issue.",
        parameters: {
            type: "object",
            properties: {
                issueKey: { type: "string" },
                watcherEmail: { type: "string" },
                watcherName: { type: "string" },
            },
            required: ["issueKey"],
        },
        async execute(_id, params) {
            try {
                const accountId = await client.resolveAssigneeAccountId(params.watcherEmail, params.watcherName);
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}/watchers`, { method: "POST", body: JSON.stringify(accountId) });
                return createToolResult(JSON.stringify({ ok: true, watcherAccountId: accountId, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_move",
        label: "Jira Issue Move",
        description: "Transition issue sang trạng thái khác bằng transition id; dùng khi workflow Jira yêu cầu move state chính xác.",
        parameters: { type: "object", properties: { issueKey: { type: "string" }, transitionId: { type: "string" } }, required: ["issueKey", "transitionId"] },
        async execute(_id, params) {
            try {
                const before = await client.getIssue(params.issueKey);
                const transitionsData = await client.getIssueTransitions(params.issueKey);
                const formatted = formatTransitions(params.issueKey, before, transitionsData);
                const matched = formatted.transitions.find((t) => t.id === String(params.transitionId));
                if (!matched) {
                    return createToolResult(JSON.stringify({
                        ok: false,
                        issueKey: params.issueKey,
                        error: "invalid_transition_id",
                        message: `Transition id ${params.transitionId} không hợp lệ cho issue ${params.issueKey}.`,
                        availableTransitions: formatted.transitions,
                    }, null, 2), true);
                }
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}/transitions`, { method: "POST", body: JSON.stringify({ transition: { id: params.transitionId } }) });
                const after = await client.getIssue(params.issueKey);
                return createToolResult(JSON.stringify({
                    ok: true,
                    issueKey: params.issueKey,
                    transition: matched,
                    fromStatus: before?.fields?.status?.name || null,
                    toStatus: after?.fields?.status?.name || matched.to?.name || null,
                    result: data || {},
                }, null, 2));
            }
            catch (e) {
                const err = normalizeJiraError(e);
                return createToolResult(JSON.stringify({
                    ok: false,
                    issueKey: params.issueKey,
                    transitionId: params.transitionId,
                    error: err.category,
                    status: err.status || null,
                    message: err.message,
                    details: err.payload || null,
                }, null, 2), true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_worklog_add",
        label: "Jira Issue Worklog Add",
        description: "Thêm worklog vào issue giống jira issue worklog add; hỗ trợ timeSpent, started, comment và newEstimate.",
        parameters: {
            type: "object",
            properties: {
                issueKey: { type: "string" },
                timeSpent: { type: "string" },
                started: { type: "string" },
                timezone: { type: "string" },
                comment: { type: "string" },
                newEstimate: { type: "string" }
            },
            required: ["issueKey", "timeSpent"]
        },
        async execute(_id, params) {
            try {
                const payload = { timeSpent: params.timeSpent };
                if (params.started)
                    payload.started = params.started;
                if (params.comment) {
                    payload.comment = {
                        type: "doc",
                        version: 1,
                        content: [{ type: "paragraph", content: [{ type: "text", text: params.comment }] }],
                    };
                }
                if (params.newEstimate)
                    payload.adjustEstimate = "new";
                if (params.newEstimate)
                    payload.newEstimate = params.newEstimate;
                const data = await client.request(`/rest/api/3/issue/${params.issueKey}/worklog`, { method: "POST", body: JSON.stringify(payload) });
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_link",
        label: "Jira Issue Link",
        description: "Link hai issue với link type phù hợp như relates to hoặc blocks để giữ đúng ngữ nghĩa quan hệ trong Jira.",
        parameters: {
            type: "object",
            properties: {
                inwardIssueKey: { type: "string" },
                outwardIssueKey: { type: "string" },
                linkType: { type: "string" },
                comment: { type: "string" },
            },
            required: ["inwardIssueKey", "outwardIssueKey"],
        },
        async execute(_id, params) {
            try {
                const data = await client.request(`/rest/api/3/issueLink`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: { name: params.linkType || "Relates" },
                        inwardIssue: { key: params.inwardIssueKey },
                        outwardIssue: { key: params.outwardIssueKey },
                        ...(params.comment ? { comment: { body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: params.comment }] }] } } } : {}),
                    }),
                });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_issue_unlink",
        label: "Jira Issue Unlink",
        description: "Xóa issue link bằng link id khi quan hệ giữa hai issue không còn đúng hoặc cần cleanup link sai.",
        parameters: { type: "object", properties: { linkId: { type: "string" } }, required: ["linkId"] },
        async execute(_id, params) {
            try {
                const data = await client.request(`/rest/api/3/issueLink/${params.linkId}`, { method: "DELETE" });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_epic_list",
        label: "Jira Epic List",
        description: "Liệt kê epics trong project để agent chọn epic đúng trước khi gắn issue hoặc rà soát phạm vi lớn.",
        parameters: { type: "object", properties: { project: { type: "string" }, maxResults: { type: "number" } } },
        async execute(_id, params) {
            try {
                const project = params?.project || rawConfig.defaultProject || "TAA";
                const q = new URLSearchParams({ jql: `project=${project} AND issuetype=\"${rawConfig.issueTypeMap?.epic || "Epic"}\"`, maxResults: String(params?.maxResults || 50), fields: "summary,status,assignee,labels" });
                const data = await client.request(`/rest/api/3/search/jql?${q.toString()}`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_epic_view",
        label: "Jira Epic View",
        description: "Xem chi tiết epic và danh sách issue con đang thuộc epic đó để phục vụ planning, audit và điều phối backlog.",
        parameters: { type: "object", properties: { epicKey: { type: "string" }, maxResults: { type: "number" } }, required: ["epicKey"] },
        async execute(_id, params) {
            try {
                const epic = await client.getIssue(params.epicKey);
                const epicLinkField = client["config"].fieldMappings.epicLink;
                const q = new URLSearchParams({ jql: `\"${epicLinkField}\"=${params.epicKey}`, maxResults: String(params?.maxResults || 50), fields: "summary,status,assignee,issuetype,parent,labels" });
                const children = await client.request(`/rest/api/3/search/jql?${q.toString()}`);
                return createToolResult(JSON.stringify({ epic, children }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_epic_add",
        label: "Jira Epic Add",
        description: "Gán một hoặc nhiều issue vào epic. Tool sẽ thử flow phù hợp trước; nếu Jira instance không hỗ trợ gắn retroactive cho issue hiện có thì trả lỗi rõ nguyên nhân và hướng workaround.",
        parameters: { type: "object", properties: { epicKey: { type: "string" }, issueKeys: { type: "array", items: { type: "string" } } }, required: ["epicKey", "issueKeys"] },
        async execute(_id, params) {
            try {
                const results = [];
                for (const issueKey of params.issueKeys || []) {
                    try {
                        const agileOut = await client.request(`/rest/agile/1.0/epic/${params.epicKey}/issue`, {
                            method: "POST",
                            body: JSON.stringify({ issues: [issueKey] }),
                        });
                        results.push({ issueKey, method: 'agile-epic-add', result: agileOut || {} });
                        continue;
                    }
                    catch (agileErr) {
                        const agileMsg = agileErr instanceof Error ? agileErr.message : String(agileErr);
                        try {
                            const parentOut = await client.request(`/rest/api/3/issue/${issueKey}`, {
                                method: "PUT",
                                body: JSON.stringify({ fields: { parent: { key: params.epicKey } } }),
                            });
                            results.push({ issueKey, method: 'parent-field', result: parentOut || {} });
                            continue;
                        }
                        catch (parentErr) {
                            const parentMsg = parentErr instanceof Error ? parentErr.message : String(parentErr);
                            try {
                                const epicLinkOut = await client.request(`/rest/api/3/issue/${issueKey}`, {
                                    method: "PUT",
                                    body: JSON.stringify({ fields: { [client["config"].fieldMappings.epicLink]: params.epicKey } }),
                                });
                                results.push({ issueKey, method: 'epic-link-field', result: epicLinkOut || {} });
                                continue;
                            }
                            catch (fieldErr) {
                                const fieldMsg = fieldErr instanceof Error ? fieldErr.message : String(fieldErr);
                                throw new Error(`Không thể gắn issue ${issueKey} vào epic ${params.epicKey}. ` +
                                    `Đã thử 3 cách: agile endpoint, parent field, Epic Link field. ` +
                                    `Chi tiết: agile=[${agileMsg}] parent=[${parentMsg}] epicLink=[${fieldMsg}]. ` +
                                    `Kết luận: Jira instance/project hiện không hỗ trợ gắn retroactive cho issue này. ` +
                                    `Workaround khuyến nghị: tạo issue mới ngay từ đầu bằng jira_create_task với tham số epic=${params.epicKey}, hoặc recreate/clone issue vào epic thay vì add sau.`);
                            }
                        }
                    }
                }
                return createToolResult(JSON.stringify({ ok: true, results }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_epic_remove",
        label: "Jira Epic Remove",
        description: "Bỏ Epic Link khỏi một hoặc nhiều issue khi cần tách khỏi epic hiện tại.",
        parameters: { type: "object", properties: { issueKeys: { type: "array", items: { type: "string" } } }, required: ["issueKeys"] },
        async execute(_id, params) {
            try {
                const results = [];
                for (const issueKey of params.issueKeys || []) {
                    const out = await client.request(`/rest/api/3/issue/${issueKey}`, { method: "PUT", body: JSON.stringify({ fields: { [client["config"].fieldMappings.epicLink]: null } }) });
                    results.push({ issueKey, result: out || {} });
                }
                return createToolResult(JSON.stringify({ ok: true, results }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_board_list",
        label: "Jira Board List",
        description: "Liệt kê boards của project để agent có thể tìm đúng board trước khi xem sprint hoặc add issue vào sprint.",
        parameters: { type: "object", properties: { project: { type: "string" }, maxResults: { type: "number" } } },
        async execute(_id, params) {
            try {
                const q = new URLSearchParams({ projectKeyOrId: params?.project || rawConfig.defaultProject || "TAA", maxResults: String(params?.maxResults || 50) });
                const data = await client.request(`/rest/agile/1.0/board?${q.toString()}`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_sprint_list",
        label: "Jira Sprint List",
        description: "Liệt kê sprints của board theo state để agent tra sprint hiện tại, sprint active hoặc sprint closed.",
        parameters: { type: "object", properties: { boardId: { type: "number" }, state: { type: "string" } }, required: ["boardId"] },
        async execute(_id, params) {
            try {
                const q = new URLSearchParams(params?.state ? { state: params.state } : {});
                const data = await client.request(`/rest/agile/1.0/board/${params.boardId}/sprint${q.toString() ? `?${q.toString()}` : ""}`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_sprint_add",
        label: "Jira Sprint Add",
        description: "Thêm một hoặc nhiều issue vào sprint đã biết sprintId.",
        parameters: { type: "object", properties: { sprintId: { type: "number" }, issueKeys: { type: "array", items: { type: "string" } } }, required: ["sprintId", "issueKeys"] },
        async execute(_id, params) {
            try {
                const data = await client.request(`/rest/agile/1.0/sprint/${params.sprintId}/issue`, { method: "POST", body: JSON.stringify({ issues: params.issueKeys }) });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_sprint_close",
        label: "Jira Sprint Close",
        description: "Đóng sprint bằng state=closed khi user yêu cầu hoàn tất sprint.",
        parameters: { type: "object", properties: { sprintId: { type: "number" } }, required: ["sprintId"] },
        async execute(_id, params) {
            try {
                const data = await client.request(`/rest/agile/1.0/sprint/${params.sprintId}`, { method: "PUT", body: JSON.stringify({ state: "closed" }) });
                return createToolResult(JSON.stringify({ ok: true, result: data || {} }, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
    api.registerTool({
        name: "jira_release_list",
        label: "Jira Release List",
        description: "Liệt kê versions/releases của project để phục vụ release planning hoặc gắn version cho issue.",
        parameters: { type: "object", properties: { project: { type: "string" } } },
        async execute(_id, params) {
            try {
                const project = params?.project || rawConfig.defaultProject || "TAA";
                const data = await client.request(`/rest/api/3/project/${project}/versions`);
                return createToolResult(JSON.stringify(data, null, 2));
            }
            catch (e) {
                return createToolResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
            }
        },
    }, { optional: true });
}
