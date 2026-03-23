import type { JiraCreateInput, JiraDefaultsRecord, JiraToolsConfig } from "../shared/types.js";
export interface JiraResolvedConfig {
    server: string;
    email: string;
    token: string;
    defaultProject: string;
    language: string;
    requireClickableLinks: boolean;
    issueTypeMap: {
        task: string;
        epic: string;
        subtask: string;
    };
    fieldMappings: {
        epicName: string;
        epicLink: string;
        parentLink: string;
    };
}
export declare class JiraClient {
    private readonly config;
    constructor(config: JiraResolvedConfig);
    private headers;
    request(path: string, init?: RequestInit): Promise<any>;
    requestRaw(path: string, init?: RequestInit): Promise<Response>;
    issueUrl(issueKey: string): string;
    getProject(projectKey: string): Promise<any>;
    getCreateMeta(projectKey: string, issueTypeName: string): Promise<any>;
    searchUsers(query: string): Promise<any>;
    getIssue(issueKey: string): Promise<any>;
    getIssueTransitions(issueKey: string): Promise<any>;
    resolveAssigneeAccountId(email?: string, displayName?: string): Promise<string | undefined>;
    buildDescription(kind: string, summary: string, objective: string, technicalDetails: string, dod: string, links?: string[], parentKey?: string): any;
    sanitizeFields(fields: Record<string, any>, createmeta: any): Record<string, any>;
    createIssue(fields: Record<string, any>): Promise<any>;
    uploadAttachment(issueKey: string, filePath: string): Promise<any>;
}
export declare function resolveConfig(raw: JiraToolsConfig): JiraResolvedConfig;
export declare function mergeDefaults(input: JiraCreateInput, defaults: JiraDefaultsRecord): JiraCreateInput;
