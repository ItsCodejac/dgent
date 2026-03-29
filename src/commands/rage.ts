import type { Command } from "commander";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { VERSION } from "../ui/brand.js";
import { loadConfig, getConfigPath } from "../config/index.js";
import { getApiKey } from "../config/secrets.js";
import { readLogs } from "../hooks/log-writer.js";
import { rules } from "../rules/index.js";

function safeGit(...args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "(unavailable)";
  }
}

function safeBin(bin: string, ...args: string[]): string {
  try {
    return execFileSync(bin, args, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "(unavailable)";
  }
}

export function registerRage(program: Command): void {
  program
    .command("rage")
    .description("Print debug info for bug reports")
    .action(() => {
      const config = loadConfig();
      const hooksPath = safeGit("config", "--global", "core.hooksPath");
      const hooksDir = join(homedir(), ".config", "dgent", "hooks");
      const hasMarker = existsSync(join(hooksDir, ".dgent"));
      const hasConsent = existsSync(join(homedir(), ".config", "dgent", "consent"));
      const hasApiKey = getApiKey() !== null;
      const configPath = getConfigPath();
      const hasConfig = existsSync(configPath);
      const recentLogs = readLogs(3);
      const nodeVersion = safeBin("node", "--version");
      const npmVersion = safeBin("npm", "--version");
      const gitVersion = safeBin("git", "--version");
      const platform = `${process.platform} ${process.arch}`;

      const enabledRules = rules.filter((r) => config.rules[r.name] ?? r.defaultEnabled);
      const disabledRules = rules.filter((r) => !(config.rules[r.name] ?? r.defaultEnabled));

      let repoOverride = "(none)";
      try {
        const root = safeGit("rev-parse", "--show-toplevel");
        const overridePath = join(root, ".dgent.json");
        if (existsSync(overridePath)) {
          repoOverride = readFileSync(overridePath, "utf-8").trim();
        }
      } catch { /* not in a repo */ }

      const lines = [
        `dgent v${VERSION}`,
        ``,
        `## Git Identity`,
        `user.name: ${safeGit("config", "--global", "user.name")}`,
        `user.email: ${safeGit("config", "--global", "user.email")}`,
        ``,
        `## Environment`,
        `Platform: ${platform}`,
        `Node: ${nodeVersion}`,
        `npm: ${npmVersion}`,
        `Git: ${gitVersion}`,
        ``,
        `## Installation`,
        `core.hooksPath: ${hooksPath}`,
        `Hooks dir exists: ${existsSync(hooksDir)}`,
        `Owned by dgent: ${hasMarker}`,
        `Consent given: ${hasConsent}`,
        ``,
        `## Configuration`,
        `Config file: ${hasConfig ? configPath : "(using defaults)"}`,
        `API key: ${hasApiKey ? "set" : "not set"}`,
        `AI enabled: ${config.ai.enabled}`,
        `AI model: ${config.ai.model}`,
        ``,
        `## Rules`,
        `Enabled (${enabledRules.length}): ${enabledRules.map((r) => r.name).join(", ")}`,
        `Disabled (${disabledRules.length}): ${disabledRules.map((r) => r.name).join(", ")}`,
        ``,
        `## Repo overrides`,
        repoOverride,
        ``,
        `## Recent logs (last 3)`,
      ];

      if (recentLogs.length === 0) {
        lines.push("(none)");
      } else {
        for (const entry of recentLogs) {
          lines.push(`${entry.timestamp} [${entry.commit ?? "?"}] ${entry.flags.length} flag(s)`);
          for (const f of entry.flags) {
            lines.push(`  ${f.rule}: ${f.message}`);
          }
        }
      }

      console.log(lines.join("\n"));
    });
}
