export interface JiraToolsConfig {
    server: string;
    email: string;
    token: string;
    defaultProject?: string;
    language?: string;
    requireClickableLinks?: boolean;
    issueTypeMap?: {
        task?: string;
        epic?: string;
        subtask?: string;
    };
    fieldMappings?: {
        epicName?: string;
        epicLink?: string;
        parentLink?: string;
    };
}
export interface JiraDefaultsRecord {
    defaultProject?: string;
    assigneeEmail?: string;
    assigneeName?: string;
    labels?: string[];
    epicKey?: string;
    parentLink?: string;
    templateTask?: string;
    templateEpic?: string;
    templateSubtask?: string;
}
export interface JiraCreateInput {
    project?: string;
    summary: string;
    body?: string;
    objective?: string;
    technicalDetails?: string;
    dod?: string;
    labels?: string[];
    links?: string[];
    assigneeEmail?: string;
    assigneeName?: string;
}
