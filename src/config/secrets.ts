import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const IS_MACOS = process.platform === "darwin";
const LINUX_KEY_PATH = join(homedir(), ".local", "share", "jent", ".key");

export function storeApiKey(key: string): void {
  if (IS_MACOS) {
    try {
      execFileSync("security", [
        "add-generic-password", "-a", "jent", "-s", "jent-api-key", "-w", key, "-U",
      ], { stdio: "pipe" });
    } catch {
      try {
        execFileSync("security", [
          "delete-generic-password", "-a", "jent", "-s", "jent-api-key",
        ], { stdio: "pipe" });
      } catch { /* may not exist */ }
      execFileSync("security", [
        "add-generic-password", "-a", "jent", "-s", "jent-api-key", "-w", key,
      ], { stdio: "pipe" });
    }
  } else {
    mkdirSync(dirname(LINUX_KEY_PATH), { recursive: true });
    writeFileSync(LINUX_KEY_PATH, key, "utf-8");
    chmodSync(LINUX_KEY_PATH, 0o600);
    console.warn("Note: API key stored in plaintext at " + LINUX_KEY_PATH);
    console.warn("Consider using ANTHROPIC_API_KEY env var instead for better security.");
  }
}

export function loadStoredApiKey(): string | null {
  if (IS_MACOS) {
    try {
      return execFileSync("security", [
        "find-generic-password", "-a", "jent", "-s", "jent-api-key", "-w",
      ], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    } catch {
      return null;
    }
  } else {
    try {
      return readFileSync(LINUX_KEY_PATH, "utf-8").trim();
    } catch {
      return null;
    }
  }
}

export function deleteApiKey(): void {
  if (IS_MACOS) {
    try {
      execFileSync("security", [
        "delete-generic-password", "-a", "jent", "-s", "jent-api-key",
      ], { stdio: "pipe" });
    } catch { /* may not exist */ }
  } else {
    try {
      unlinkSync(LINUX_KEY_PATH);
    } catch { /* may not exist */ }
  }
}

export function getApiKey(): string | null {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return envKey;
  return loadStoredApiKey();
}
