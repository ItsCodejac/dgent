import type { Command } from "commander";

export function registerReview(program: Command): void {
  program
    .command("review")
    .description("Open TUI to review flags from the last commit")
    .action(() => {
      console.log("review: not implemented yet");
    });
}
