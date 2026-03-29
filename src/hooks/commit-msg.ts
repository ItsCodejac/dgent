import { readFileSync, writeFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { getApiKey } from "../config/secrets.js";
import { rules } from "../rules/index.js";
import type { Flag } from "../rules/index.js";
import { callSkill } from "../ai/client.js";
import { loadSkill } from "../ai/skill-loader.js";
import { LOGO_COMPACT, printFlag, printRuleResult, printDryRunHeader } from "../ui/brand.js";
import { dim, yellow, green } from "../ui/colors.js";
import { writeLog } from "./log-writer.js";

const FIX_MESSAGE_SCHEMA = {
  type: "object",
  properties: {
    fixed_message: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flag: { type: "string" },
          description: { type: "string" },
        },
        required: ["flag", "description"],
      },
    },
  },
  required: ["fixed_message", "changes"],
} as const;

interface FixMessageResult {
  fixed_message: string;
  changes: Array<{ flag: string; description: string }>;
}

export async function handleCommitMsg(msgFilePath: string): Promise<void> {
  const dryRun = process.env.DGENT_DRY_RUN === "1";

  try {
    const config = loadConfig();
    let message = readFileSync(msgFilePath, "utf-8");
    const original = message;
    const allFlags: Flag[] = [];
    const fixRules: string[] = [];

    const commitMsgRules = rules.filter((r) => r.phase === "commit-msg");

    for (const rule of commitMsgRules) {
      const enabled = config.rules[rule.name] ?? rule.defaultEnabled;
      if (!enabled) continue;

      const result = await rule.apply(message);

      if (result.changed) {
        message = result.output;
        fixRules.push(rule.name);
      }

      if (result.flags.length > 0) {
        allFlags.push(...result.flags);
      }
    }

    const hasChanges = fixRules.length > 0 || allFlags.length > 0;
    if (!hasChanges) return;

    if (dryRun) {
      printDryRunHeader();
      for (const name of fixRules) printRuleResult(name, "fixed");
      for (const flag of allFlags) printFlag(flag);
      console.error(`  ${dim("no changes applied")}`);
      return;
    }

    // Apply deterministic fixes
    if (message !== original) {
      writeFileSync(msgFilePath, message, "utf-8");
      if (config.output.verbose) {
        console.error(`  ${LOGO_COMPACT} ${dim("cleaned:")} ${fixRules.join(", ")}`);
      }
    }

    // AI autofix for flags
    if (allFlags.length > 0 && config.ai.enabled && config.ai.autofix && getApiKey()) {
      try {
        const skill = loadSkill();
        const flagDescriptions = allFlags
          .map((f) => `- Line ${f.line}: [${f.rule}] ${f.message}`)
          .join("\n");

        const currentMessage = readFileSync(msgFilePath, "utf-8");
        const userContent = [
          "## Fix these flags in the commit message:",
          flagDescriptions,
          "",
          "## Commit message:",
          currentMessage,
        ].join("\n");

        const result = await callSkill<FixMessageResult>(
          skill,
          userContent,
          FIX_MESSAGE_SCHEMA as unknown as Record<string, unknown>,
        );

        if (result && result.fixed_message !== currentMessage) {
          writeFileSync(msgFilePath, result.fixed_message, "utf-8");
          console.error(`  ${LOGO_COMPACT} ${green("autofix")} ${dim("resolved")} ${result.changes.length} ${dim("flag(s)")}`);
          for (const change of result.changes) {
            console.error(`    ${dim("→")} ${dim(change.description)}`);
          }
          return; // Flags resolved, don't print them
        }
      } catch {
        // AI autofix failed, fall through to print flags
      }
    }

    // Print flags (if not auto-fixed)
    if (allFlags.length > 0) {
      console.error(`  ${LOGO_COMPACT} ${yellow(`${allFlags.length} flag${allFlags.length > 1 ? "s" : ""}`)}`);
      for (const flag of allFlags) printFlag(flag);
      writeLog(allFlags);
    }
  } catch (err) {
    console.error(`  ${LOGO_COMPACT} ${dim(`error: ${err instanceof Error ? err.message : String(err)}`)}`);
  }
}
