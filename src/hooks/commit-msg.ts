import { readFileSync, writeFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Flag } from "../rules/index.js";
import { LOGO_COMPACT, printFlag, printRuleResult, printDryRunHeader } from "../ui/brand.js";
import { dim, yellow } from "../ui/colors.js";
import { writeLog } from "./log-writer.js";

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

    // Apply fixes
    if (message !== original) {
      writeFileSync(msgFilePath, message, "utf-8");
      if (config.output.verbose) {
        console.error(`  ${LOGO_COMPACT} ${dim("cleaned:")} ${fixRules.join(", ")}`);
      }
    }

    // Print flags
    if (allFlags.length > 0) {
      console.error(`  ${LOGO_COMPACT} ${yellow(`${allFlags.length} flag${allFlags.length > 1 ? "s" : ""}`)}`);
      for (const flag of allFlags) printFlag(flag);

      writeLog(allFlags);
    }
  } catch (err) {
    console.error(`  ${LOGO_COMPACT} ${dim(`error: ${err instanceof Error ? err.message : String(err)}`)}`);
  }
}
