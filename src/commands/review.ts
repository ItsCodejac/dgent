import type { Command } from "commander";
import { readLogs } from "../hooks/log-writer.js";
import { loadConfig, saveConfig } from "../config/index.js";
import { printCompact, printFlag } from "../ui/brand.js";
import { dim, yellow, cyan } from "../ui/colors.js";

export function registerReview(program: Command): void {
  program
    .command("review")
    .description("Review flags from the last commit")
    .action(async () => {
      const entries = readLogs(1);

      if (entries.length === 0) {
        printCompact(dim("no flags to review"));
        return;
      }

      const entry = entries[0];

      // Use Ink TUI if interactive terminal
      if (process.stdout.isTTY) {
        try {
          const { renderReview } = await import("../tui/render.js");
          await renderReview(entry, (rule: string) => {
            const config = loadConfig();
            config.rules[rule] = false;
            saveConfig(config);
          });
          return;
        } catch {
          // Fall back to non-interactive if Ink fails
        }
      }

      // Non-interactive fallback
      printCompact(`${yellow(`${entry.flags.length} flag${entry.flags.length > 1 ? "s" : ""}`)} ${entry.commit ? cyan(entry.commit) : ""}\n`);

      for (const flag of entry.flags) {
        printFlag(flag);
      }

      console.error("");
      console.error(`  ${dim("Use")} ${cyan("dgent log")} ${dim("for full history")}`);
      console.error(`  ${dim("Use")} ${cyan("dgent config set rules.<name> false")} ${dim("to disable a rule")}`);
    });
}
