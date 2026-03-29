import type { Command } from "commander";

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Self-update via npm")
    .action(() => {
      console.log("update: not implemented yet");
    });
}
