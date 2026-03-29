import { readFileSync, writeFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Flag } from "../rules/index.js";

export async function handleCommitMsg(msgFilePath: string): Promise<void> {
  const dryRun = process.env.DGENT_DRY_RUN === "1";

  try {
    const config = loadConfig();
    let message = readFileSync(msgFilePath, "utf-8");
    const original = message;
    const allFlags: Flag[] = [];
    const rulesApplied: string[] = [];

    // Run commit-msg rules in order
    const commitMsgRules = rules.filter((r) => r.phase === "commit-msg");

    for (const rule of commitMsgRules) {
      const enabled = config.rules[rule.name] ?? rule.defaultEnabled;
      if (!enabled) continue;

      const result = await rule.apply(message);

      if (result.changed) {
        message = result.output;
        rulesApplied.push(rule.name);
      }

      if (result.flags.length > 0) {
        allFlags.push(...result.flags);
        rulesApplied.push(rule.name);
      }
    }

    if (dryRun) {
      if (rulesApplied.length === 0) {
        console.error("[dry-run] No changes would be made.");
      } else {
        console.error("[dry-run] Rules that would fire:");
        for (const name of [...new Set(rulesApplied)]) {
          console.error(`  - ${name}`);
        }
        if (message !== original) {
          console.error("\n[dry-run] Modified message:");
          console.error(message);
        }
        if (allFlags.length > 0) {
          console.error("\n[dry-run] Flags:");
          for (const flag of allFlags) {
            console.error(`  line ${flag.line}: ${flag.message}`);
          }
        }
        console.error("\n[dry-run] No changes applied.");
      }
      return;
    }

    // Write modified message
    if (message !== original) {
      writeFileSync(msgFilePath, message, "utf-8");
      if (config.output.verbose) {
        console.error(`dgent: modified commit message (${rulesApplied.filter((r) => rules.find((rule) => rule.name === r)?.type === "fix").join(", ")})`);
      }
    }

    // Print flags as warnings
    if (allFlags.length > 0) {
      console.error("dgent: commit message flags:");
      for (const flag of allFlags) {
        console.error(`  line ${flag.line}: ${flag.message}`);
      }
    }
  } catch (err) {
    // Never block a commit
    console.error(`dgent: error in commit-msg hook (${err instanceof Error ? err.message : String(err)})`);
  }
}
