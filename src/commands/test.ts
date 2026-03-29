import type { Command } from "commander";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAllFixtures } from "../testing/runner.js";
import { rules } from "../rules/index.js";
import { printCompact } from "../ui/brand.js";
import { dim } from "../ui/colors.js";

export function registerTest(program: Command): void {
  program
    .command("test", { hidden: true })
    .description("Run fixture suite (development)")
    .option("--rule <name>", "Run fixtures for one rule")
    .option("--update", "Overwrite expected files with current output")
    .action(async (options: { rule?: string; update?: boolean }) => {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const fixturesDir = join(__dirname, "..", "..", "test", "fixtures");

      printCompact(dim("test\n"));
      const { failed } = await runAllFixtures(rules, fixturesDir, options);
      process.exit(failed > 0 ? 1 : 0);
    });
}
