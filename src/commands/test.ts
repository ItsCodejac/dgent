import type { Command } from "commander";

export function registerTest(program: Command): void {
  program
    .command("test")
    .description("Run fixture suite")
    .option("--rule <name>", "Run fixtures for one rule")
    .option("--update", "Overwrite expected files with current output")
    .action((options: { rule?: string; update?: boolean }) => {
      console.log(`test: not implemented yet (rule=${options.rule ?? "all"}, update=${options.update ?? false})`);
    });
}
