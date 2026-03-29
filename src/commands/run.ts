import type { Command } from "commander";
import { readFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Rule } from "../rules/index.js";
import { printCompact, printRuleResult, printFlag } from "../ui/brand.js";
import { dim, green, cyan } from "../ui/colors.js";

export function registerRun(program: Command): void {
  program
    .command("run [file]")
    .description("Manual pass on a file or stdin diff")
    .option("--dry-run", "Preview changes without applying")
    .option("--commit-msg", "Run commit message rules only")
    .option("--pre-commit", "Run pre-commit (code) rules only")
    .action(async (file: string | undefined, options: { dryRun?: boolean; commitMsg?: boolean; preCommit?: boolean }) => {
      let input: string;

      if (file === "-" || !file) {
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk as Buffer);
        }
        input = Buffer.concat(chunks).toString("utf-8");
      } else {
        try {
          input = readFileSync(file, "utf-8");
        } catch (err) {
          console.error(`Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      }

      // Determine which phase to run
      let phase: "commit-msg" | "pre-commit" | "both" = "both";
      if (options.commitMsg) phase = "commit-msg";
      if (options.preCommit) phase = "pre-commit";

      // Auto-detect: if no flag specified and file has a code extension, run pre-commit only
      if (phase === "both" && file && file !== "-") {
        const codeExtensions = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".rb", ".swift"];
        if (codeExtensions.some((ext) => file.endsWith(ext))) {
          phase = "pre-commit";
        }
      }

      const config = loadConfig();
      let output = input;
      let totalFlags = 0;
      let totalFixes = 0;

      const phaseLabel = phase === "both" ? "all rules" : `${phase} rules`;
      printCompact(`${dim(file ?? "stdin")} ${dim("·")} ${dim(phaseLabel)}`);
      console.error("");

      const targetRules: Rule[] = rules.filter((r) => {
        if (phase !== "both" && r.phase !== phase) return false;
        return config.rules[r.name] ?? r.defaultEnabled;
      });

      for (const rule of targetRules) {
        const result = await rule.apply(output);

        if (result.changed) {
          output = result.output;
          totalFixes++;
          printRuleResult(rule.name, "fixed");
        } else if (result.flags.length > 0) {
          printRuleResult(rule.name, "flagged");
        }

        for (const flag of result.flags) {
          printFlag({ ...flag, file });
          totalFlags++;
        }
      }

      if (totalFixes === 0 && totalFlags === 0) {
        console.error(`  ${green("✓")} ${dim("clean")}`);
      }

      console.error("");

      if (output !== input && !options.dryRun) {
        process.stdout.write(output);
      } else if (options.dryRun && output !== input) {
        console.error(`  ${dim("dry-run — changes not applied")}`);
      }
    });
}
