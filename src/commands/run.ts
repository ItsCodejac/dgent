import type { Command } from "commander";
import { readFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import { printCompact, printRuleResult, printFlag } from "../ui/brand.js";
import { dim, green } from "../ui/colors.js";

export function registerRun(program: Command): void {
  program
    .command("run [file]")
    .description("Manual pass on a file or stdin diff")
    .option("--dry-run", "Preview changes without applying")
    .action(async (file: string | undefined, options: { dryRun?: boolean }) => {
      let input: string;

      if (file === "-" || !file) {
        // Read from stdin
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

      const config = loadConfig();
      let output = input;
      let totalFlags = 0;
      let totalFixes = 0;

      printCompact(dim(file ?? "stdin"));
      console.error("");

      for (const rule of rules) {
        const enabled = config.rules[rule.name] ?? rule.defaultEnabled;
        if (!enabled) continue;

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
        console.error(`  ${green("✓")} ${dim("clean — no issues found")}`);
      }

      console.error("");

      // Output cleaned content to stdout (pipeable)
      if (output !== input && !options.dryRun) {
        process.stdout.write(output);
      } else if (options.dryRun && output !== input) {
        console.error(`  ${dim("dry-run — changes not applied")}`);
      }
    });
}
