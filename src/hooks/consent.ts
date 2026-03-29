import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const CONSENT_PATH = join(homedir(), ".config", "dgent", "consent");

export function hasConsented(): boolean {
  return existsSync(CONSENT_PATH);
}

export function recordConsent(): void {
  mkdirSync(dirname(CONSENT_PATH), { recursive: true });
  writeFileSync(CONSENT_PATH, `consented: ${new Date().toISOString()}\n`, "utf-8");
}

export function promptConsent(enabledRules: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    console.error("");
    console.error("dgent: first-run consent for file transforms");
    console.error("=========================================");
    console.error("");
    console.error("dgent will modify staged files and re-stage them before commit.");
    console.error("Enabled diff rules:");
    for (const rule of enabledRules) {
      console.error(`  - ${rule}`);
    }
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
        console.error("Consent recorded. dgent will now modify staged files.");
      } else {
        console.error("Skipping file transforms. Commit message rules still active.");
        console.error("Run this again and type 'yes' to enable, or create ~/.config/dgent/consent manually.");
      }
      resolve(accepted);
    });
  });
}
