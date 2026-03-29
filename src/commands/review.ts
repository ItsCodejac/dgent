import type { Command } from "commander";
import { readLogs } from "../hooks/log-writer.js";
import { printCompact, printFlag } from "../ui/brand.js";
import { dim, yellow, cyan } from "../ui/colors.js";

export function registerReview(program: Command): void {
  program
    .command("review")
    .description("Review flags from the last commit")
    .action(() => {
      const entries = readLogs(1);

      if (entries.length === 0) {
        printCompact(dim("no flags to review"));
        return;
      }

      const entry = entries[0];
      const commit = entry.commit ? cyan(entry.commit) : "";

      printCompact(`${yellow(`${entry.flags.length} flag${entry.flags.length > 1 ? "s" : ""}`)} ${commit}\n`);

      for (const flag of entry.flags) {
        printFlag({
          rule: flag.rule,
          line: flag.line,
          message: flag.message,
          suggestion: flag.suggestion,
        });
      }

      console.error("");
      console.error(`  ${dim("Use")} ${cyan("dgent log")} ${dim("for full history")}`);
      console.error(`  ${dim("Use")} ${cyan("dgent config set rules.<name> false")} ${dim("to disable a rule")}`);
    });
}
