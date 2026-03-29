import type { Command } from "commander";
import { readFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Rule, Flag } from "../rules/index.js";
import { printCompact, printRuleResult, printFlag } from "../ui/brand.js";
import { dim, green } from "../ui/colors.js";

interface JsonResult {
  file: string | null;
  phase: string;
  clean: boolean;
  fixes: Array<{ rule: string }>;
  flags: Array<{ rule: string; line: number; message: string; suggestion?: string }>;
  output?: string;
}

export function registerRun(program: Command): void {
  program
    .command("run [file]")
    .description("Manual pass on a file or stdin diff")
    .option("--dry-run", "Preview changes without applying")
    .option("--commit-msg", "Run commit message rules only")
    .option("--pre-commit", "Run pre-commit (code) rules only")
    .option("--json", "Output results as JSON (for agent/CI consumption)")
    .action(async (file: string | undefined, options: { dryRun?: boolean; commitMsg?: boolean; preCommit?: boolean; json?: boolean }) => {
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
          if (options.json) {
            console.log(JSON.stringify({ error: `Cannot read ${file}` }));
          } else {
            console.error(`Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
          }
          process.exit(1);
        }
      }

      let phase: "commit-msg" | "pre-commit" | "both" = "both";
      if (options.commitMsg) phase = "commit-msg";
      if (options.preCommit) phase = "pre-commit";

      if (phase === "both" && file && file !== "-") {
        const codeExtensions = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".rb", ".swift"];
        if (codeExtensions.some((ext) => file.endsWith(ext))) {
          phase = "pre-commit";
        }
      }

      const config = loadConfig();
      let output = input;
      const fixResults: Array<{ rule: string }> = [];
      const flagResults: Flag[] = [];

      const targetRules: Rule[] = rules.filter((r) => {
        if (phase !== "both" && r.phase !== phase) return false;
        return config.rules[r.name] ?? r.defaultEnabled;
      });

      if (!options.json) {
        const phaseLabel = phase === "both" ? "all rules" : `${phase} rules`;
        printCompact(`${dim(file ?? "stdin")} ${dim("·")} ${dim(phaseLabel)}`);
        console.error("");
      }

      for (const rule of targetRules) {
        const result = await rule.apply(output);

        if (result.changed) {
          output = result.output;
          fixResults.push({ rule: rule.name });
          if (!options.json) printRuleResult(rule.name, "fixed");
        } else if (result.flags.length > 0) {
          if (!options.json) printRuleResult(rule.name, "flagged");
        }

        for (const flag of result.flags) {
          flagResults.push(flag);
          if (!options.json) printFlag({ ...flag, file });
        }
      }

      if (options.json) {
        const jsonResult: JsonResult = {
          file: file ?? null,
          phase,
          clean: fixResults.length === 0 && flagResults.length === 0,
          fixes: fixResults,
          flags: flagResults.map((f) => ({
            rule: f.rule,
            line: f.line,
            message: f.message,
            suggestion: f.suggestion,
          })),
        };
        if (output !== input) {
          jsonResult.output = output;
        }
        console.log(JSON.stringify(jsonResult, null, 2));
        process.exit(flagResults.length > 0 ? 1 : fixResults.length > 0 ? 2 : 0);
        return;
      }

      if (fixResults.length === 0 && flagResults.length === 0) {
        console.error(`  ${green("✓")} ${dim("clean")}`);
      }
      console.error("");

      if (output !== input && !options.dryRun) {
        process.stdout.write(output);
      } else if (options.dryRun && output !== input) {
        console.error(`  ${dim("dry-run — changes not applied")}`);
      }

      // Exit codes: 0 = clean, 1 = flags found, 2 = fixes applied
      if (flagResults.length > 0) process.exit(1);
      if (fixResults.length > 0) process.exit(2);
    });
}
