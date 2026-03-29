import { existsSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { printInitSuccess, printInitConflict, printUninstallSuccess, printSuccess, printInfo } from "../ui/brand.js";

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

  const preCommitPath = join(HOOKS_DIR, "pre-commit");
  writeFileSync(preCommitPath, PRE_COMMIT_HOOK, "utf-8");
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
