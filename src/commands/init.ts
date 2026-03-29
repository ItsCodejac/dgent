import type { Command } from "commander";
import { installHooks } from "../hooks/install.js";
import { showInitPreview } from "../hooks/preview.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Install global git hooks")
    .action(async () => {
      installHooks();
      await showInitPreview();
    });
}
