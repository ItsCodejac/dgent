import { readFileSync, writeFileSync } from "node:fs";
import { execSync, execFileSync } from "node:child_process";
import { extname } from "node:path";
import { loadConfig } from "../config/index.js";
import { getApiKey } from "../config/secrets.js";
import { rules } from "../rules/index.js";
import type { Flag } from "../rules/index.js";
import { callSkill } from "../ai/client.js";
import { loadSkill } from "../ai/skill-loader.js";
import { hasConsented, promptConsent } from "./consent.js";
import { parseIgnoreComments, filterIgnoredFlags } from "../rules/ignore.js";
import { dim, green } from "../ui/colors.js";
import { LOGO_COMPACT } from "../ui/brand.js";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".o",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".pyc", ".class", ".wasm",
]);

function isBinary(file: string): boolean {
  return BINARY_EXTENSIONS.has(extname(file).toLowerCase());
}

function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

function hasUnstagedChanges(file: string): boolean {
  try {
    const output = execFileSync("git", ["diff", "--name-only", "--", file], {
      encoding: "utf-8",
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

function restage(file: string): void {
  execFileSync("git", ["add", file]);
}

export async function handlePreCommit(): Promise<void> {
  const dryRun = process.env.DGENT_DRY_RUN === "1";

  try {
    const config = loadConfig();
    const preCommitRules = rules.filter((r) => r.phase === "pre-commit");
    const enabledRules = preCommitRules.filter(
      (r) => config.rules[r.name] ?? r.defaultEnabled,
    );

    if (enabledRules.length === 0) return;

    // Consent check (skip in non-interactive or dry-run)
    if (!dryRun && process.stdin.isTTY) {
      if (!hasConsented()) {
        const consented = await promptConsent(enabledRules.map((r) => r.name));
        if (!consented) return;
      }
    } else if (!dryRun && !hasConsented()) {
      // Non-interactive, no consent — skip silently
      return;
    }

    const stagedFiles = getStagedFiles();
    if (stagedFiles.length === 0) return;

    const textFiles = stagedFiles.filter((f) => !isBinary(f));
    const safeFiles: string[] = [];
    const mixedFiles: string[] = [];

    for (const file of textFiles) {
      if (hasUnstagedChanges(file)) {
        mixedFiles.push(file);
      } else {
        safeFiles.push(file);
      }
    }

    if (mixedFiles.length > 0) {
      console.error(
        `dgent: skipping ${mixedFiles.length} file(s) with mixed staged/unstaged changes:`,
      );
      for (const f of mixedFiles) {
        console.error(`  - ${f}`);
      }
    }

    const allFlags: Flag[] = [];

    for (const file of safeFiles) {
      let content: string;
      try {
        content = readFileSync(file, "utf-8");
      } catch {
        continue;
      }

      let modified = content;
      const fileFlags: Flag[] = [];
      const rulesApplied: string[] = [];
      const ignoreMap = parseIgnoreComments(content);

      for (const rule of enabledRules) {
        const result = await rule.apply(modified);
        if (result.changed) {
          modified = result.output;
          rulesApplied.push(rule.name);
        }
        if (result.flags.length > 0) {
          const filtered = filterIgnoredFlags(result.flags, ignoreMap);
          fileFlags.push(...filtered);
        }
      }

      if (dryRun) {
        if (modified !== content || fileFlags.length > 0) {
          console.error(`[dry-run] ${file}:`);
          if (modified !== content) {
            console.error(`  Would modify (${rulesApplied.join(", ")})`);
          }
          for (const flag of fileFlags) {
            console.error(`  Flag line ${flag.line}: ${flag.message}`);
          }
        }
        continue;
      }

      if (modified !== content) {
        writeFileSync(file, modified, "utf-8");
        restage(file);
        if (config.output.verbose) {
          console.error(`dgent: modified ${file} (${rulesApplied.join(", ")})`);
        }
      }

      // AI autofix for file flags
      if (!dryRun && fileFlags.length > 0 && config.ai.enabled && config.ai.autofix && getApiKey()) {
        try {
          const skill = loadSkill();
          const flagDescriptions = fileFlags
            .map((f) => `- Line ${f.line}: [${f.rule}] ${f.message}`)
            .join("\n");

          const codeToFix = modified; // Use already-deterministically-cleaned version
          const userContent = [
            "## Fix these flags in the code:",
            flagDescriptions,
            "",
            "## Code:",
            "```",
            codeToFix,
            "```",
          ].join("\n");

          const FIX_CODE_SCHEMA = {
            type: "object",
            properties: {
              fixed_code: { type: "string" },
              changes: { type: "array", items: { type: "object", properties: { flag: { type: "string" }, description: { type: "string" } }, required: ["flag", "description"] } },
            },
            required: ["fixed_code", "changes"],
          } as const;

          const result = await callSkill<{ fixed_code: string; changes: Array<{ flag: string; description: string }> }>(
            skill,
            userContent,
            FIX_CODE_SCHEMA as unknown as Record<string, unknown>,
          );

          if (result && result.fixed_code !== codeToFix) {
            writeFileSync(file, result.fixed_code, "utf-8");
            restage(file);
            console.error(`  ${LOGO_COMPACT} ${green("autofix")} ${dim(file)} ${dim("→")} ${result.changes.length} ${dim("fix(es)")}`);
            continue; // Flags resolved for this file
          }
        } catch {
          // AI autofix failed, fall through to collect flags
        }
      }

      allFlags.push(...fileFlags.map((f) => ({ ...f, message: `${file}:${f.line} ${f.message}` })));
    }

    if (dryRun && safeFiles.length > 0) {
      console.error("[dry-run] No changes applied.");
    }

    if (!dryRun && allFlags.length > 0) {
      console.error("dgent: pre-commit flags:");
      for (const flag of allFlags) {
        console.error(`  ${flag.message}`);
      }
    }
  } catch (err) {
    console.error(
      `dgent: error in pre-commit hook (${err instanceof Error ? err.message : String(err)})`,
    );
  }
}
