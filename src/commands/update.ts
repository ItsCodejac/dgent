import type { Command } from "commander";
import { execSync } from "node:child_process";
import { VERSION, printCompact } from "../ui/brand.js";
import { dim, green, yellow, cyan } from "../ui/colors.js";

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Self-update via npm")
    .action(() => {
      printCompact(dim("checking for updates..."));

      let latest: string;
      try {
        latest = execSync("npm view dgent version", {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
      } catch {
        console.error(`  ${yellow("!")} Could not check npm registry.`);
        console.error(`  ${dim("Run")} ${cyan("npm update -g dgent")} ${dim("manually.")}`);
        return;
      }

      if (latest === VERSION) {
        console.error(`  ${green("✓")} Already up to date ${dim(`(v${VERSION})`)}`);
        return;
      }

      console.error(`  ${dim("Updating")} v${VERSION} ${dim("→")} v${latest}`);

      try {
        execSync("npm update -g dgent", { stdio: "inherit" });
        console.error(`  ${green("✓")} Updated to v${latest}`);
      } catch {
        console.error(`  ${yellow("!")} Update failed.`);
        console.error(`  ${dim("Run")} ${cyan("npm update -g dgent")} ${dim("manually.")}`);
      }
    });
}
