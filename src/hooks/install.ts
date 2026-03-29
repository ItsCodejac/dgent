import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

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

const COMMIT_MSG_HOOK = `#!/bin/sh
dgent hook commit-msg "$@" || true
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
dgent hook pre-commit "$@" || true
`;

function writeHookScripts(): void {
  mkdirSync(HOOKS_DIR, { recursive: true });

  const commitMsgPath = join(HOOKS_DIR, "commit-msg");
  writeFileSync(commitMsgPath, COMMIT_MSG_HOOK, "utf-8");
  chmodSync(commitMsgPath, 0o755);

  // Write pre-commit hook script (handler is stub until Phase 4)
  const preCommitPath = join(HOOKS_DIR, "pre-commit");
  writeFileSync(preCommitPath, PRE_COMMIT_HOOK, "utf-8");
  chmodSync(preCommitPath, 0o755);

  // Write marker
  writeFileSync(MARKER_FILE, `installed: ${new Date().toISOString()}\n`, "utf-8");
}

export function installHooks(): void {
  const current = getCurrentHooksPath();

  if (current && !isOwnedByDgent(current)) {
    console.error(`Error: core.hooksPath is already set to: ${current}`);
    console.error("");
    console.error("dgent cannot install without overwriting your existing hooks.");
    console.error("To use dgent alongside your existing hooks, add this to your");
    console.error(`existing commit-msg hook at ${join(current, "commit-msg")}:`);
    console.error("");
    console.error('  dgent hook commit-msg "$@" || true');
    console.error("");
    console.error("Then add this to your pre-commit hook:");
    console.error("");
    console.error('  dgent hook pre-commit "$@" || true');
    process.exit(1);
  }

  if (current && isOwnedByDgent(current)) {
    console.log("Updating existing dgent hooks...");
    writeHookScripts();
    console.log("Done. Hooks updated.");
    return;
  }

  // Fresh install
  writeHookScripts();
  execSync(`git config --global core.hooksPath "${HOOKS_DIR}"`);
  console.log(`Installed git hooks to ${HOOKS_DIR}`);
  console.log("core.hooksPath set globally. dgent will run on every commit.");
}

export function uninstallHooks(): void {
  const current = getCurrentHooksPath();

  if (!current) {
    console.log("dgent hooks not installed (core.hooksPath not set).");
    return;
  }

  if (!isOwnedByDgent(current)) {
    console.error(`core.hooksPath is set to ${current}, but it's not managed by dgent.`);
    console.error("Not removing. Uninstall manually if needed.");
    return;
  }

  // Remove hooks directory
  try {
    rmSync(HOOKS_DIR, { recursive: true, force: true });
  } catch {
    // Best effort
  }

  // Unset core.hooksPath
  try {
    execSync("git config --global --unset core.hooksPath");
  } catch {
    // May fail if already unset
  }

  console.log("dgent hooks removed. core.hooksPath unset.");
}
