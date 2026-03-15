import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { JiraDefaultsRecord } from "../shared/types.js";

function safeKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export class JiraDefaultsStore {
  private baseDir: string;

  constructor(baseDir?: string) {
    const stateDir = process.env.OPENCLAW_STATE_DIR || `${process.env.HOME}/.openclaw`;
    this.baseDir = baseDir || join(stateDir, "plugin-data", "jira-tools", "defaults");
    mkdirSync(this.baseDir, { recursive: true });
  }

  private filePath(agentId: string, userId: string): string {
    return join(this.baseDir, `${safeKey(agentId)}__${safeKey(userId)}.json`);
  }

  get(agentId: string, userId: string): JiraDefaultsRecord {
    const fp = this.filePath(agentId, userId);
    if (!existsSync(fp)) return {};
    return JSON.parse(readFileSync(fp, "utf8")) as JiraDefaultsRecord;
  }

  set(agentId: string, userId: string, patch: JiraDefaultsRecord): JiraDefaultsRecord {
    const next = { ...this.get(agentId, userId), ...patch };
    writeFileSync(this.filePath(agentId, userId), JSON.stringify(next, null, 2), "utf8");
    return next;
  }
}
