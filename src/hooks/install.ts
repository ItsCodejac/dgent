import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { printInitSuccess, printInitConflict, printUninstallSuccess, printSuccess, printWarning, printInfo } from "../ui/brand.js";
import { dim, cyan, yellow } from "../ui/colors.js";
import { deleteApiKey } from "../config/secrets.js";

const HOOKS_DIR = join(homedir(), ".config", "dgent", "hooks");
const MARKER_FILE = join(HOOKS_DIR, ".dgent");

function getCurrentHooksPath(): string | null {
  try {
    return execFileSync("git", ["config", "--global", "core.hooksPath"], { encoding: "utf-8" }).trim() || null;
  } catch {
    return null;
  }
}

function hashFile(path: string): string {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return "";
  }
}

function isOwnedByDgent(hooksPath: string): boolean {
  const markerPath = join(hooksPath, ".dgent");
  if (!existsSync(markerPath)) return false;

  // Verify integrity — check that hook scripts haven't been tampered with
  try {
    const marker = readFileSync(markerPath, "utf-8");
    const commitMsgHash = hashFile(join(hooksPath, "commit-msg"));
    const preCommitHash = hashFile(join(hooksPath, "pre-commit"));

    const storedCommitMsg = marker.match(/commit-msg: ([a-f0-9]+)/)?.[1];
    const storedPreCommit = marker.match(/pre-commit: ([a-f0-9]+)/)?.[1];

    if (storedCommitMsg && storedCommitMsg !== commitMsgHash) {
      printWarning("commit-msg hook has been modified outside dgent");
    }
    if (storedPreCommit && storedPreCommit !== preCommitHash) {
      printWarning("pre-commit hook has been modified outside dgent");
    }
  } catch {
    // If we can't verify, still treat as owned (marker exists)
  }

  return true;
}

function getDgentPath(): string {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const result = execFileSync(cmd, ["dgent"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    // `where` on Windows can return multiple lines — take the first
    return result.split("\n")[0].trim();
  } catch {
    return "dgent";
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

  // Store hashes for integrity verification
  const commitMsgHash = hashFile(join(HOOKS_DIR, "commit-msg"));
  const preCommitHash = hashFile(join(HOOKS_DIR, "pre-commit"));
  writeFileSync(MARKER_FILE, [
    `installed: ${new Date().toISOString()}`,
    `commit-msg: ${commitMsgHash}`,
    `pre-commit: ${preCommitHash}`,
  ].join("\n") + "\n", "utf-8");
  try { chmodSync(HOOKS_DIR, 0o700); } catch { /* best effort */ }
}

export async function installHooks(skipConfirm = false): Promise<void> {
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

  // First install — warn about global scope and confirm
  if (!skipConfirm && process.stdin.isTTY) {
    console.error("");
    printWarning("This will set global core.hooksPath for ALL git repos on this machine.");
    printInfo("Existing per-repo hooks (husky, lefthook, etc.) will be bypassed.");
    printInfo("Use dgent uninstall to reverse this at any time.");
    console.error("");

    const { createInterface } = await import("node:readline");
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    const answer = await new Promise<string>((resolve) => {
      rl.question("  Install global hooks? (yes/no): ", resolve);
    });
    rl.close();

    if (answer.trim().toLowerCase() !== "yes" && answer.trim().toLowerCase() !== "y") {
      printInfo("Cancelled.");
      return;
    }
  }

  writeHookScripts();
  execFileSync("git", ["config", "--global", "core.hooksPath", HOOKS_DIR]);
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
    const name = execFileSync("git", ["config", "--global", "user.name"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const email = execFileSync("git", ["config", "--global", "user.email"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();

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

export function uninstallHooks(options: { keepConfig?: boolean } = {}): void {
  const current = getCurrentHooksPath();
  const removed: string[] = [];

  if (!current) {
    printInfo("dgent hooks not installed (no core.hooksPath).");
  } else if (!isOwnedByDgent(current)) {
    printInfo(`core.hooksPath set to ${current} — not managed by dgent.`);
  } else {
    try {
      rmSync(HOOKS_DIR, { recursive: true, force: true });
      removed.push(`hooks: ${HOOKS_DIR}`);
    } catch { /* best effort */ }

    try {
      execFileSync("git", ["config", "--global", "--unset", "core.hooksPath"]);
      removed.push("git config: core.hooksPath unset");
    } catch { /* may already be unset */ }
  }

  // Clean up ~/.config/dgent/
  const configDir = join(homedir(), ".config", "dgent");
  if (existsSync(configDir)) {
    if (options.keepConfig) {
      // Remove everything except config.json
      const configJsonPath = join(configDir, "config.json");
      try {
        const entries = readDirEntries(configDir);
        for (const entry of entries) {
          const entryPath = join(configDir, entry);
          if (entryPath === configJsonPath) continue;
          try {
            rmSync(entryPath, { recursive: true, force: true });
          } catch { /* best effort */ }
        }
        removed.push(`config dir: ${configDir} (kept config.json)`);
      } catch { /* best effort */ }
    } else {
      try {
        rmSync(configDir, { recursive: true, force: true });
        removed.push(`config dir: ${configDir}`);
      } catch { /* best effort */ }
    }
  }

  // Clean up ~/.local/share/dgent/ (logs)
  const dataDir = join(homedir(), ".local", "share", "dgent");
  if (existsSync(dataDir)) {
    try {
      rmSync(dataDir, { recursive: true, force: true });
      removed.push(`data dir: ${dataDir}`);
    } catch { /* best effort */ }
  }

  // Delete macOS Keychain / Linux key file
  try {
    deleteApiKey();
    removed.push("api key: keychain/key file entry");
  } catch { /* best effort */ }

  // Clean up Claude Code skills
  const claudeSkillsDir = join(homedir(), ".claude", "skills", "dgent");
  if (existsSync(claudeSkillsDir)) {
    try {
      rmSync(claudeSkillsDir, { recursive: true, force: true });
      removed.push(`claude skills: ${claudeSkillsDir}`);
    } catch { /* best effort */ }
  }

  // Clean up OpenClaw skills
  const openclawSkillsDir = join(homedir(), ".openclaw", "workspace", "skills", "dgent");
  if (existsSync(openclawSkillsDir)) {
    try {
      rmSync(openclawSkillsDir, { recursive: true, force: true });
      removed.push(`openclaw skills: ${openclawSkillsDir}`);
    } catch { /* best effort */ }
  }

  if (removed.length === 0) {
    printInfo("Nothing to remove.");
  } else {
    printUninstallSuccess();
    for (const item of removed) {
      printInfo(`removed ${item}`);
    }
  }
}

function readDirEntries(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
