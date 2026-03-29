import type { Command } from "commander";
import { uninstallHooks } from "../hooks/install.js";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description("Remove global hooks and restore previous hooksPath")
    .action(() => {
      uninstallHooks();
    });
}
