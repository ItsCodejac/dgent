import type { Command } from "commander";
import { installHooks } from "../hooks/install.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Install global git hooks")
    .action(() => {
      installHooks();
    });
}
