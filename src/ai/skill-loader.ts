import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const OVERRIDE_PATH = join(homedir(), ".config", "dgent", "skill.md");

export function loadSkill(): string {
  // Check for user override first
  if (existsSync(OVERRIDE_PATH)) {
    return readFileSync(OVERRIDE_PATH, "utf-8");
  }

  // Load bundled skill.md
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const bundledPath = join(__dirname, "..", "..", "src", "ai", "skill.md");

  // When installed as npm package, the path is different
  const altPath = join(__dirname, "skill.md");

  if (existsSync(bundledPath)) {
    return readFileSync(bundledPath, "utf-8");
  }
  if (existsSync(altPath)) {
    return readFileSync(altPath, "utf-8");
  }

  // Fallback inline
  return "You are dgent's AI skill layer. Analyze the input and respond with valid JSON matching the provided schema.";
}
