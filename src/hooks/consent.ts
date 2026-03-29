import { existsSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const CONSENT_PATH = join(homedir(), ".config", "dgent", "consent");

export function hasConsented(): boolean {
  return existsSync(CONSENT_PATH);
}

export function recordConsent(): void {
  const dir = dirname(CONSENT_PATH);
  mkdirSync(dir, { recursive: true });
  try { chmodSync(dir, 0o700); } catch { /* best effort */ }
  writeFileSync(CONSENT_PATH, `consented: ${new Date().toISOString()}\n`, "utf-8");
}

export function promptConsent(enabledRules: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    console.error("");
    console.error("dgent: first-run consent");
    console.error("========================");
    console.error("");
    console.error("dgent will modify staged files and re-stage them before commit.");
    console.error("");
    console.error("Enabled rules:");
    for (const rule of enabledRules) {
      console.error(`  - ${rule}`);
    }
    console.error("");
    console.error("IMPORTANT: If AI features are enabled (ai.enabled + api key),");
    console.error("file contents and commit messages may be sent to the Anthropic");
    console.error("API for processing. Review ai.enabled and ai.autofix settings");
    console.error("with: dgent config list");
    console.error("");
    console.error("Use DGENT_DRY_RUN=1 to preview changes without applying.");
    console.error("This prompt only appears once.");
    console.error("");

    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question("Enable file transforms? (yes/no): ", (answer) => {
      rl.close();
      const accepted = answer.trim().toLowerCase() === "yes" || answer.trim().toLowerCase() === "y";
      if (accepted) {
        recordConsent();
        console.error("Consent recorded.");
      } else {
        console.error("Skipping file transforms. Commit message rules still active.");
      }
      resolve(accepted);
    });
  });
}
