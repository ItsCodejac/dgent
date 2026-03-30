import type { Command } from "commander";
import { readLogs } from "../hooks/log-writer.js";
import { loadConfig, saveConfig } from "../config/index.js";
import { printCompact, printFlag } from "../ui/brand.js";
import { dim, yellow, cyan } from "../ui/colors.js";

export function registerReview(program: Command): void {
  program
    .command("review")
    .description("Show flags from recent commits")
    .option("--count <n>", "Number of recent commits to review", "1")
    .action(async (options: { count: string }) => {
      const count = parseInt(options.count, 10) || 1;
      const entries = readLogs(count);

      if (entries.length === 0) {
        printCompact(dim("no flags to review"));
        return;
      }

      // Single entry — use TUI if available
      if (entries.length === 1) {
        const entry = entries[0];
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
      }

      // Non-interactive fallback (or multiple entries)
      for (const entry of entries) {
        printCompact(`${yellow(`${entry.flags.length} flag${entry.flags.length > 1 ? "s" : ""}`)} ${entry.commit ? cyan(entry.commit) : ""}\n`);

        for (const flag of entry.flags) {
          printFlag(flag);
        }
        console.error("");
      }

      console.error(`  ${dim("Use")} ${cyan("dgent log")} ${dim("for full history")}`);
      console.error(`  ${dim("Use")} ${cyan("dgent config set rules.<name> false")} ${dim("to disable a rule")}`);
    });
}
