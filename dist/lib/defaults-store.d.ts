import type { JiraDefaultsRecord } from "../shared/types.js";
export declare class JiraDefaultsStore {
    private baseDir;
    constructor(baseDir?: string);
    private filePath;
    get(agentId: string, userId: string): JiraDefaultsRecord;
    set(agentId: string, userId: string, patch: JiraDefaultsRecord): JiraDefaultsRecord;
}
