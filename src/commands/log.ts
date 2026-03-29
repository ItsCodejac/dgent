import type { Command } from "commander";
import { readLogs } from "../hooks/log-writer.js";
import { printCompact } from "../ui/brand.js";
import { dim, yellow, cyan, gray } from "../ui/colors.js";

export function registerLog(program: Command): void {
  program
    .command("log")
    .description("Show flagged items from recent commits")
    .option("--all", "Show all entries, not just last 10")
    .action((options: { all?: boolean }) => {
      const entries = readLogs(options.all ? 1000 : 10);

      if (entries.length === 0) {
        printCompact(dim("no flags recorded yet"));
        return;
      }

      printCompact(`${entries.length} recent entries\n`);

      for (const entry of entries) {
        const date = new Date(entry.timestamp);
        const ts = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        const commit = entry.commit ? cyan(entry.commit) : gray("—");
        const count = yellow(`${entry.flags.length} flag${entry.flags.length > 1 ? "s" : ""}`);

        console.log(`  ${dim(ts)}  ${commit}  ${count}`);

        for (const flag of entry.flags) {
          const rule = dim(`[${flag.rule}]`);
          console.log(`    ${yellow("▸")} ${rule} ${flag.message}`);
        }
        console.log("");
      }
    });
}
