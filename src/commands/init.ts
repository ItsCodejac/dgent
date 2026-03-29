import type { Command } from "commander";
import { installHooks } from "../hooks/install.js";
import { showInitPreview } from "../hooks/preview.js";
import { recordConsent } from "../hooks/consent.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Install global git hooks")
    .option("-y, --yes", "Skip confirmation prompt")
    .option("--consent", "Pre-authorize file transforms (for CI/scripts)")
    .action(async (options: { yes?: boolean; consent?: boolean }) => {
      await installHooks(options.yes);
      if (options.consent) {
        recordConsent();
      }
      await showInitPreview();
    });
}
