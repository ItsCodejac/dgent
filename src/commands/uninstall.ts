import type { Command } from "commander";
import { uninstallHooks } from "../hooks/install.js";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description("Remove global hooks, config, keys, and skill files")
    .option("--keep-config", "Preserve ~/.config/dgent/config.json")
    .action((options: { keepConfig?: boolean }) => {
      uninstallHooks({ keepConfig: options.keepConfig });
    });
}
