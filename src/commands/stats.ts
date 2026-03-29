import type { Command } from "commander";
import { readLogs } from "../hooks/log-writer.js";
import { printCompact } from "../ui/brand.js";
import { dim, yellow, cyan, green, bold, white } from "../ui/colors.js";

export function registerStats(program: Command): void {
  program
    .command("stats")
    .description("Show statistics on caught tells")
    .option("--all", "Include all history, not just last 30 days")
    .action((options: { all?: boolean }) => {
      const entries = readLogs(options.all ? 100000 : 1000);

      if (entries.length === 0) {
        printCompact(dim("no data yet — commit with dgent active to start tracking"));
        return;
      }

      // Filter to last 30 days unless --all
      const cutoff = options.all ? 0 : Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filtered = entries.filter((e) => new Date(e.timestamp).getTime() > cutoff);

      if (filtered.length === 0) {
        printCompact(dim("no flags in the last 30 days — use --all for full history"));
        return;
      }

      // Aggregate
      const ruleCount = new Map<string, number>();
      let totalFlags = 0;
      const commitSet = new Set<string>();
      const dateSet = new Set<string>();

      for (const entry of filtered) {
        if (entry.commit) commitSet.add(entry.commit);
        dateSet.add(entry.timestamp.slice(0, 10));

        for (const flag of entry.flags) {
          totalFlags++;
          ruleCount.set(flag.rule, (ruleCount.get(flag.rule) ?? 0) + 1);
        }
      }

      // Sort rules by count
      const sortedRules = [...ruleCount.entries()].sort((a, b) => b[1] - a[1]);
      const maxCount = sortedRules[0]?.[1] ?? 0;
      const barWidth = 20;

      // Header
      const period = options.all ? "all time" : "last 30 days";
      printCompact(`${dim("stats ·")} ${dim(period)}\n`);

      // Summary
      console.error(`  ${bold(white(String(totalFlags)))} ${dim("flags across")} ${bold(white(String(filtered.length)))} ${dim("commits")}`);
      console.error(`  ${dim("active days:")} ${dateSet.size}`);
      console.error("");

      // Rule breakdown with bar chart
      console.error(`  ${dim("by rule:")}`);
      for (const [rule, count] of sortedRules) {
        const barLen = Math.max(1, Math.round((count / maxCount) * barWidth));
        const bar = yellow("█".repeat(barLen)) + dim("░".repeat(barWidth - barLen));
        const pct = Math.round((count / totalFlags) * 100);
        console.error(`  ${bar} ${cyan(rule)} ${dim(`${count} (${pct}%)`)}`);
      }

      // Trend (last 7 entries vs prior 7)
      if (filtered.length >= 4) {
        const mid = Math.floor(filtered.length / 2);
        const recent = filtered.slice(0, mid);
        const older = filtered.slice(mid);

        const recentAvg = recent.reduce((sum, e) => sum + e.flags.length, 0) / recent.length;
        const olderAvg = older.reduce((sum, e) => sum + e.flags.length, 0) / older.length;

        console.error("");
        if (recentAvg < olderAvg * 0.8) {
          console.error(`  ${green("↓")} ${dim("trend: fewer flags recently — your code is getting cleaner")}`);
        } else if (recentAvg > olderAvg * 1.2) {
          console.error(`  ${yellow("↑")} ${dim("trend: more flags recently")}`);
        } else {
          console.error(`  ${dim("→ trend: stable")}`);
        }
      }

      console.error("");
    });
}
