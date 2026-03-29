import type { Command } from "commander";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Install global git hooks")
    .action(() => {
      console.log("init: not implemented yet");
    });
}
