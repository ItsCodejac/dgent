import { execSync } from "node:child_process";
import type { Rule, RuleResult } from "./index.js";
import { loadConfig } from "../config/index.js";
import { getApiKey } from "../config/secrets.js";
import { callSkill } from "../ai/client.js";
import { loadSkill } from "../ai/skill-loader.js";

const REWRITE_SCHEMA = {
  type: "object",
  properties: {
    rewritten_message: { type: "string" },
    changed: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["rewritten_message", "changed", "reason"],
} as const;

interface RewriteResult {
  rewritten_message: string;
  changed: boolean;
  reason: string;
}

function getRecentCommitMessages(count: number = 10): string[] {
  try {
    const output = execSync(`git log --format=%s -n ${count}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

export const rewriteMessage: Rule = {
  name: "rewrite-message",
  phase: "commit-msg",
  type: "fix",
  defaultEnabled: false,

  async apply(input: string): Promise<RuleResult> {
    const noChange: RuleResult = { output: input, changed: false, flags: [] };

    const config = loadConfig();
    if (!config.ai.enabled) return noChange;
    if (!getApiKey()) return noChange;

    try {
      const skill = loadSkill();
      const recentMessages = getRecentCommitMessages();

      const userContent = [
        "## Commit message to rewrite:",
        input,
        "",
        "## Recent commit messages from this repo (for voice matching):",
        ...recentMessages.map((m, i) => `${i + 1}. ${m}`),
      ].join("\n");

      const result = await callSkill<RewriteResult>(
        skill,
        userContent,
        REWRITE_SCHEMA as unknown as Record<string, unknown>,
      );

      if (!result || !result.changed) return noChange;

      return {
        output: result.rewritten_message,
        changed: true,
        flags: [],
      };
    } catch {
      return noChange;
    }
  },
};
