import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
function safeKey(input) {
    return input.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
export class JiraDefaultsStore {
    baseDir;
    constructor(baseDir) {
        const stateDir = process.env.OPENCLAW_STATE_DIR || `${process.env.HOME}/.openclaw`;
        this.baseDir = baseDir || join(stateDir, "plugin-data", "jira-tools", "defaults");
        mkdirSync(this.baseDir, { recursive: true });
    }
    filePath(agentId, userId) {
        return join(this.baseDir, `${safeKey(agentId)}__${safeKey(userId)}.json`);
    }
    get(agentId, userId) {
        const fp = this.filePath(agentId, userId);
        if (!existsSync(fp))
            return {};
        return JSON.parse(readFileSync(fp, "utf8"));
    }
    set(agentId, userId, patch) {
        const next = { ...this.get(agentId, userId), ...patch };
        writeFileSync(this.filePath(agentId, userId), JSON.stringify(next, null, 2), "utf8");
        return next;
    }
}
