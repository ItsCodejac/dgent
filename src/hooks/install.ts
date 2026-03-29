import { existsSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync, execFileSync } from "node:child_process";
import { printInitSuccess, printInitConflict, printUninstallSuccess, printSuccess, printWarning, printInfo } from "../ui/brand.js";
import { dim, cyan, yellow } from "../ui/colors.js";

const HOOKS_DIR = join(homedir(), ".config", "dgent", "hooks");
const MARKER_FILE = join(HOOKS_DIR, ".dgent");

function getCurrentHooksPath(): string | null {
  try {
    return execSync("git config --global core.hooksPath", { encoding: "utf-8" }).trim() || null;
  } catch {
    return null;
  }
}

function isOwnedByDgent(hooksPath: string): boolean {
  return existsSync(join(hooksPath, ".dgent"));
}

function getDgentPath(): string {
  try {
    return execFileSync("which", ["dgent"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "dgent"; // Fallback to PATH lookup
  }
}

function makeHookScript(type: string, dgentPath: string): string {
  return `#!/bin/sh
# dgent — de-agent your code
DGENT="${dgentPath}"
if ! command -v "$DGENT" >/dev/null 2>&1; then
  DGENT="dgent"
fi
"$DGENT" hook ${type} "$@" || true
`;
}

function writeHookScripts(): void {
  mkdirSync(HOOKS_DIR, { recursive: true });
  const dgentPath = getDgentPath();

  const commitMsgPath = join(HOOKS_DIR, "commit-msg");
  writeFileSync(commitMsgPath, makeHookScript("commit-msg", dgentPath), "utf-8");
  chmodSync(commitMsgPath, 0o755);

  const preCommitPath = join(HOOKS_DIR, "pre-commit");
  writeFileSync(preCommitPath, makeHookScript("pre-commit", dgentPath), "utf-8");
  chmodSync(preCommitPath, 0o755);

  writeFileSync(MARKER_FILE, `installed: ${new Date().toISOString()}\n`, "utf-8");
}

export function installHooks(): void {
  const current = getCurrentHooksPath();

  if (current && !isOwnedByDgent(current)) {
    printInitConflict(current);
    process.exit(1);
  }

  if (current && isOwnedByDgent(current)) {
    writeHookScripts();
    printSuccess("Hooks updated.");
    return;
  }

  writeHookScripts();
  execSync(`git config --global core.hooksPath "${HOOKS_DIR}"`);
  printInitSuccess(HOOKS_DIR);

  // Check git identity for agent-looking config
  checkGitIdentity();
}

const AGENT_PATTERNS = [
  "bot", "copilot", "cursor", "devin", "codex", "noreply",
  "github-actions", "dependabot", "renovate",
];

function checkGitIdentity(): void {
  try {
    const name = execSync("git config --global user.name", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const email = execSync("git config --global user.email", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();

    const nameOrEmail = `${name} ${email}`.toLowerCase();
    const looksLikeAgent = AGENT_PATTERNS.some((p) => nameOrEmail.includes(p));
    const looksLikeDefault = email.endsWith(".local") || name.includes("@");

    if (looksLikeAgent) {
      console.error("");
      printWarning(`Your git identity looks agent-generated:`);
      console.error(`    ${dim("user.name =")} ${yellow(name)}`);
      console.error(`    ${dim("user.email =")} ${yellow(email)}`);
      console.error("");
      console.error(`  ${dim("dgent cleans commit content, but not git metadata.")}`);
      console.error(`  ${dim("Fix with:")}`);
      console.error(`    ${cyan('git config --global user.name "Your Name"')}`);
      console.error(`    ${cyan('git config --global user.email "you@example.com"')}`);
      console.error("");
    } else if (looksLikeDefault) {
      console.error("");
      printInfo(`Your git email looks auto-generated: ${yellow(email)}`);
      console.error(`  ${dim("Consider setting it:")}`);
      console.error(`    ${cyan('git config --global user.email "you@example.com"')}`);
      console.error("");
    }
  } catch {
    // No git config, not a problem
  }
}

export function uninstallHooks(): void {
  const current = getCurrentHooksPath();

  if (!current) {
    printInfo("dgent hooks not installed.");
    return;
  }

  if (!isOwnedByDgent(current)) {
    printInfo(`core.hooksPath set to ${current} — not managed by dgent.`);
    return;
  }

  try {
    rmSync(HOOKS_DIR, { recursive: true, force: true });
  } catch { /* best effort */ }

  try {
    execSync("git config --global --unset core.hooksPath");
  } catch { /* may already be unset */ }

  printUninstallSuccess();
}
