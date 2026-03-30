import type { Command } from "commander";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { printCompact, printSuccess, printWarning, printError, printInfo } from "../ui/brand.js";
import { dim, cyan, yellow, green, red } from "../ui/colors.js";
import { getApiKey } from "../config/secrets.js";
import { loadConfig, getConfigPath } from "../config/index.js";

function safeGit(...args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

const AGENT_PATTERNS = [
  "bot", "copilot", "cursor", "devin", "codex", "noreply",
  "github-actions", "dependabot", "renovate",
];

interface Check {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  fix?: string;
}

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Check dgent setup and common issues")
    .action(() => {
      printCompact(`${dim("checking setup...")}\n`);

      const checks: Check[] = [];

      // 1. Hooks installed?
      const hooksPath = safeGit("config", "--global", "core.hooksPath");
      const hooksDir = join(homedir(), ".config", "dgent", "hooks");
      const hasMarker = existsSync(join(hooksDir, ".dgent"));

      if (hooksPath && hasMarker) {
        checks.push({ name: "Hooks", status: "pass", message: "installed and active" });
      } else if (hooksPath && !hasMarker) {
        checks.push({
          name: "Hooks",
          status: "warn",
          message: `core.hooksPath set to ${hooksPath} (not dgent)`,
          fix: "Run dgent init or chain manually",
        });
      } else {
        checks.push({
          name: "Hooks",
          status: "fail",
          message: "not installed",
          fix: "dgent init",
        });
      }

      // 2. Consent given?
      const hasConsent = existsSync(join(homedir(), ".config", "dgent", "consent"));
      if (hasConsent) {
        checks.push({ name: "Consent", status: "pass", message: "file transforms authorized" });
      } else {
        checks.push({
          name: "Consent",
          status: "warn",
          message: "file transforms not yet authorized",
          fix: "Will prompt on first commit with staged files",
        });
      }

      // 3. Git identity
      const gitName = safeGit("config", "--global", "user.name") ?? safeGit("config", "user.name");
      const gitEmail = safeGit("config", "--global", "user.email") ?? safeGit("config", "user.email");

      if (gitName && gitEmail) {
        const combined = `${gitName} ${gitEmail}`.toLowerCase();
        const looksAgent = AGENT_PATTERNS.some((p) => combined.includes(p));
        const looksDefault = gitEmail.endsWith(".local") || gitName.includes("@");

        if (looksAgent) {
          checks.push({
            name: "Git identity",
            status: "fail",
            message: `looks agent-generated: ${gitName} <${gitEmail}>`,
            fix: `git config --global user.name "Your Name" && git config --global user.email "you@example.com"`,
          });
        } else if (looksDefault) {
          checks.push({
            name: "Git identity",
            status: "warn",
            message: `looks auto-generated: ${gitEmail}`,
            fix: `git config --global user.email "you@example.com"`,
          });
        } else {
          checks.push({ name: "Git identity", status: "pass", message: `${gitName} <${gitEmail}>` });
        }
      } else {
        checks.push({
          name: "Git identity",
          status: "warn",
          message: "not configured",
          fix: `git config --global user.name "Your Name"`,
        });
      }

      // 4. Config valid?
      const configPath = getConfigPath();
      if (existsSync(configPath)) {
        try {
          JSON.parse(readFileSync(configPath, "utf-8"));
          checks.push({ name: "Config", status: "pass", message: configPath });
        } catch {
          checks.push({
            name: "Config",
            status: "fail",
            message: "invalid JSON",
            fix: `Delete ${configPath} to reset to defaults`,
          });
        }
      } else {
        checks.push({ name: "Config", status: "pass", message: "using defaults" });
      }

      // 5. API key?
      const config = loadConfig();
      if (config.ai.enabled) {
        if (getApiKey()) {
          checks.push({ name: "AI layer", status: "pass", message: `enabled, model: ${config.ai.model}` });
        } else {
          checks.push({
            name: "AI layer",
            status: "fail",
            message: "enabled but no API key",
            fix: "dgent config set api-key <key>",
          });
        }
      } else {
        checks.push({ name: "AI layer", status: "pass", message: "disabled (deterministic rules only)" });
      }

      // 6. Repo overrides?
      const repoRoot = safeGit("rev-parse", "--show-toplevel");
      if (repoRoot) {
        const overridePath = join(repoRoot, ".dgent.json");
        if (existsSync(overridePath)) {
          try {
            JSON.parse(readFileSync(overridePath, "utf-8"));
            checks.push({ name: "Repo overrides", status: "pass", message: ".dgent.json found" });
          } catch {
            checks.push({
              name: "Repo overrides",
              status: "fail",
              message: ".dgent.json has invalid JSON",
              fix: "Fix or delete .dgent.json",
            });
          }
        }
      }

      // Print results
      const passes = checks.filter((c) => c.status === "pass");
      const warns = checks.filter((c) => c.status === "warn");
      const fails = checks.filter((c) => c.status === "fail");

      for (const check of checks) {
        const icon = check.status === "pass" ? green("✓") : check.status === "warn" ? yellow("!") : red("✗");
        const color = check.status === "pass" ? dim : check.status === "warn" ? yellow : red;
        console.error(`  ${icon} ${check.name}: ${color(check.message)}`);
        if (check.fix) {
          console.error(`    ${dim("→")} ${cyan(check.fix)}`);
        }
      }

      console.error("");
      if (fails.length === 0 && warns.length === 0) {
        printSuccess("all clear");
      } else if (fails.length === 0) {
        printInfo(`${passes.length} passed, ${warns.length} warning(s)`);
      } else {
        printWarning(`${passes.length} passed, ${warns.length} warning(s), ${fails.length} issue(s)`);
      }
    });
}
