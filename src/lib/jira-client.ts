import type { JiraCreateInput, JiraDefaultsRecord, JiraToolsConfig } from "../shared/types.js";

export interface JiraResolvedConfig {
  server: string;
  email: string;
  token: string;
  defaultProject: string;
  language: string;
  requireClickableLinks: boolean;
  issueTypeMap: { task: string; epic: string; subtask: string };
  fieldMappings: { epicName: string; epicLink: string; parentLink: string };
}

export class JiraClient {
  constructor(private readonly config: JiraResolvedConfig) {}

  private headers() {
    return {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${this.config.email}:${this.config.token}`).toString("base64")}`,
    };
  }

  async request(path: string, init?: RequestInit): Promise<any> {
    const res = await fetch(`${this.config.server}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers || {}) },
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(payload)}`);
    return payload;
  }

  issueUrl(issueKey: string): string {
    return `${this.config.server}/browse/${issueKey}`;
  }

  async getProject(projectKey: string) {
    return this.request(`/rest/api/3/project/${projectKey}`);
  }

  async getCreateMeta(projectKey: string, issueTypeName: string) {
    const q = new URLSearchParams({
      projectKeys: projectKey,
      issuetypeNames: issueTypeName,
      expand: "projects.issuetypes.fields",
    });
    return this.request(`/rest/api/3/issue/createmeta?${q.toString()}`);
  }

  async searchUsers(query: string) {
    const q = new URLSearchParams({ query, maxResults: "20" });
    return this.request(`/rest/api/3/user/search?${q.toString()}`);
  }

  async getIssue(issueKey: string) {
    return this.request(`/rest/api/3/issue/${issueKey}`);
  }

  async resolveAssigneeAccountId(email?: string, displayName?: string): Promise<string | undefined> {
    const query = email || displayName;
    if (!query) return undefined;
    const users = await this.searchUsers(query);
    if (!Array.isArray(users) || users.length === 0) throw new Error(`Không tìm thấy assignee: ${query}`);
    const exact = users.find((u: any) => (email && u.emailAddress === email) || (displayName && u.displayName === displayName));
    return (exact || users[0]).accountId;
  }

  buildDescription(kind: string, summary: string, objective: string, technicalDetails: string, dod: string, links?: string[], parentKey?: string): any {
    const lines = [
      `## Loại issue`, `- ${kind}`,
      ``, `## Mục tiêu`, objective,
      ``, `## Chi tiết kỹ thuật`, technicalDetails,
      ``, `## Tiêu chuẩn hoàn thành (DoD)`, dod,
    ];
    if (parentKey) lines.push("", "## Issue cha", `- ${parentKey}`, `- Link: ${this.issueUrl(parentKey)}`);
    if (links && links.length) lines.push("", "## Links liên quan", ...links.map((x) => `- ${x}`));
    lines.push("", "## Ghi chú", "- Nội dung và comment Jira dùng tiếng Việt.");
    const content = lines.map((line) => line ? ({ type: "paragraph", content: [{ type: "text", text: line }] }) : ({ type: "paragraph", content: [] }));
    return { type: "doc", version: 1, content };
  }

  sanitizeFields(fields: Record<string, any>, createmeta: any): Record<string, any> {
    const allowed = new Set<string>();
    const projects = createmeta?.projects || [];
    const issueTypes = projects[0]?.issuetypes || [];
    const metaFields = issueTypes[0]?.fields || {};
    for (const k of Object.keys(metaFields)) allowed.add(k);
    const keep = new Set(["project", "summary", "description", "issuetype", "labels", "assignee", "parent"]);
    return Object.fromEntries(Object.entries(fields).filter(([k]) => keep.has(k) || allowed.has(k)));
  }

  async createIssue(fields: Record<string, any>) {
    return this.request(`/rest/api/3/issue`, { method: "POST", body: JSON.stringify({ fields }) });
  }
}

export function resolveConfig(raw: JiraToolsConfig): JiraResolvedConfig {
  return {
    server: raw.server.replace(/\/$/, ""),
    email: raw.email,
    token: raw.token,
    defaultProject: raw.defaultProject || "TAA",
    language: raw.language || "vi",
    requireClickableLinks: raw.requireClickableLinks !== false,
    issueTypeMap: {
      task: raw.issueTypeMap?.task || "Task",
      epic: raw.issueTypeMap?.epic || "Epic",
      subtask: raw.issueTypeMap?.subtask || "Subtask",
    },
    fieldMappings: {
      epicName: raw.fieldMappings?.epicName || "customfield_10011",
      epicLink: raw.fieldMappings?.epicLink || "customfield_10014",
      parentLink: raw.fieldMappings?.parentLink || "customfield_10018",
    },
  };
}

export function mergeDefaults(input: JiraCreateInput, defaults: JiraDefaultsRecord): JiraCreateInput {
  return {
    ...input,
    project: input.project || defaults.defaultProject,
    assigneeEmail: input.assigneeEmail || defaults.assigneeEmail,
    assigneeName: input.assigneeName || defaults.assigneeName,
    labels: input.labels?.length ? input.labels : defaults.labels,
  };
}
