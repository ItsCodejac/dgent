import { writeFileSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import type { Flag } from "../rules/index.js";

const LOG_DIR = join(homedir(), ".local", "share", "dgent", "logs");

function getCommitHash(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

export function writeLog(flags: Flag[], commit?: string): void {
  if (flags.length === 0) return;

  try {
    mkdirSync(LOG_DIR, { recursive: true });

    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${ts}.json`;

    const entry = {
      timestamp: now.toISOString(),
      commit: commit ?? getCommitHash(),
      flags: flags.map((f) => ({
        rule: f.rule,
        line: f.line,
        message: f.message,
        suggestion: f.suggestion,
      })),
    };

    writeFileSync(join(LOG_DIR, filename), JSON.stringify(entry, null, 2) + "\n", "utf-8");

    // Log rotation — keep last 1000 files, remove older
    pruneOldLogs();
  } catch {
    // Logging failures are silent
  }
}

const MAX_LOG_FILES = 1000;

function pruneOldLogs(): void {
  try {
    const files = readdirSync(LOG_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();

    if (files.length <= MAX_LOG_FILES) return;

    const toRemove = files.slice(0, files.length - MAX_LOG_FILES);
    for (const f of toRemove) {
      try { unlinkSync(join(LOG_DIR, f)); } catch { /* best effort */ }
    }
  } catch {
    // Pruning failures are silent
  }
}

export interface LogEntry {
  timestamp: string;
  commit: string | null;
  flags: Array<{ rule: string; line: number; message: string; suggestion?: string }>;
}

export function readLogs(limit: number = 10): LogEntry[] {
  try {
    const files = readdirSync(LOG_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, limit);

    return files.map((f) => JSON.parse(readFileSync(join(LOG_DIR, f), "utf-8")));
  } catch {
    return [];
  }
}
