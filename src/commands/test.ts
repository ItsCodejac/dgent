import type { Command } from "commander";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAllFixtures } from "../testing/runner.js";
import { rules } from "../rules/index.js";

export function registerTest(program: Command): void {
  program
    .command("test")
    .description("Run fixture suite")
    .option("--rule <name>", "Run fixtures for one rule")
    .option("--update", "Overwrite expected files with current output")
    .action((options: { rule?: string; update?: boolean }) => {
      // Find project root (where test/fixtures lives)
      // When installed globally, fixtures ship with the package
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const fixturesDir = join(__dirname, "..", "..", "test", "fixtures");

      console.log("dgent test\n");
      const { failed } = runAllFixtures(rules, fixturesDir, options);
      process.exit(failed > 0 ? 1 : 0);
    });
}
