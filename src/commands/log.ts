import type { Command } from "commander";

export function registerLog(program: Command): void {
  program
    .command("log")
    .description("Show flagged items from recent commits")
    .action(() => {
      console.log("log: not implemented yet");
    });
}
