import type { Command } from "commander";
import { execFileSync } from "node:child_process";
import { VERSION, printCompact } from "../ui/brand.js";
import { dim, green, yellow, cyan } from "../ui/colors.js";

// dgent-ignore flag-naming
function detectPackageManager(): { name: string; cmd: string } {
  // Check npm_config_user_agent first (set by npm/pnpm/yarn/bun when running scripts)
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.startsWith("pnpm/")) return { name: "pnpm", cmd: "pnpm" };
  if (userAgent.startsWith("yarn/")) return { name: "yarn", cmd: "yarn" };
  if (userAgent.startsWith("bun/")) return { name: "bun", cmd: "bun" };

  // Fallback: check if alternative package managers are available
  for (const pm of ["pnpm", "yarn", "bun"] as const) {
    try {
      execFileSync(pm, ["--version"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      // Only prefer if npm wasn't the installer — just having it installed isn't enough
    } catch {
      // not available
    }
  }

  return { name: "npm", cmd: "npm" };
}

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Self-update")
    .action(() => {
      const pm = detectPackageManager();
      printCompact(dim(`checking for updates (${pm.name})...`));

      let latest: string;
      try {
        if (pm.name === "yarn") {
          latest = execFileSync("npm", ["view", "dgent", "version"], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }).trim();
        } else {
          latest = execFileSync(pm.cmd, ["view", "dgent", "version"], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }).trim();
        }
      } catch {
        console.error(`  ${yellow("!")} Could not check registry.`);
        console.error(`  ${dim("Run")} ${cyan(`${pm.cmd} update -g dgent`)} ${dim("manually.")}`);
        return;
      }

      if (latest === VERSION) {
        console.error(`  ${green("✓")} Already up to date ${dim(`(v${VERSION})`)}`);
        return;
      }

      console.error(`  ${dim("Updating")} v${VERSION} ${dim("→")} v${latest}`);

      try {
        if (pm.name === "yarn") {
          execFileSync("yarn", ["global", "add", "dgent"], { stdio: "inherit" });
        } else if (pm.name === "bun") {
          execFileSync("bun", ["install", "-g", "dgent"], { stdio: "inherit" });
        } else {
          execFileSync(pm.cmd, ["update", "-g", "dgent"], { stdio: "inherit" });
        }
        console.error(`  ${green("✓")} Updated to v${latest}`);
      } catch {
        console.error(`  ${yellow("!")} Update failed.`);
        console.error(`  ${dim("Run")} ${cyan(`${pm.cmd} update -g dgent`)} ${dim("manually.")}`);
      }
    });
}
