import type { Command } from "commander";

export function registerRun(program: Command): void {
  program
    .command("run [file]")
    .description("Manual pass on a file or stdin diff")
    .option("--dry-run", "Preview changes without applying")
    .action((file: string | undefined, options: { dryRun?: boolean }) => {
      console.log(`run: not implemented yet (file=${file ?? "stdin"}, dryRun=${options.dryRun ?? false})`);
    });
}
