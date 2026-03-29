import type { Command } from "commander";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description("Remove global hooks and restore previous hooksPath")
    .action(() => {
      console.log("uninstall: not implemented yet");
    });
}
