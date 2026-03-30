import type { Command } from "commander";
import { handleCommitMsg } from "../hooks/commit-msg.js";
import { handlePreCommit } from "../hooks/pre-commit.js";

export function registerHook(program: Command): void {
  const hook = program
    .command("hook")
    .description("Internal: called by git hook scripts")
    .argument("<type>", "hook type (commit-msg or pre-commit)")
    .argument("[args...]", "additional arguments passed by git")
    .allowUnknownOption()
    .action(async (type: string, args: string[]) => {
      switch (type) {
        case "commit-msg": {
          const msgFile = args[0];
          if (!msgFile) {
            console.error("dgent hook commit-msg: no message file provided");
            process.exit(0);
          }
          await handleCommitMsg(msgFile);
          break;
        }
        case "pre-commit":
          await handlePreCommit();
          break;
        default:
          console.error(`dgent hook: unknown hook type "${type}"`);
      }
    });

  (hook as unknown as Record<string, boolean>)._hidden = true;
}
