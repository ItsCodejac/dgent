import type { Command } from "commander";
import { rules } from "../rules/index.js";
import { printCompact } from "../ui/brand.js";
import { dim, cyan, green, yellow } from "../ui/colors.js";

// Export the full pattern lists for machine consumption
const RULE_PATTERNS: Record<string, Record<string, unknown>> = {
  "strip-trailers": {
    description: "Removes AI attribution lines like Co-Authored-By from commit messages",
    aiEmails: ["noreply@anthropic.com", "github-copilot[bot]", "copilot@github.com", "devin-ai-integration[bot]", "cursor[bot]", "codeium[bot]"],
    trailerPrefixes: ["Generated-By:", "Assisted-By:"],
    footerPatterns: ["🤖 Generated with *"],
  },
  "strip-emojis": {
    description: "Strips emoji characters from the start of commit messages",
  },
  "flag-message-tone": {
    description: "Warns when commit messages use words and phrases typical of AI-generated text",
    words: ["enhance", "streamline", "comprehensive", "utilize", "leverage", "facilitate", "robust", "optimize"],
    phrases: ["this commit", "this change", "in order to", "aims to", "is designed to"],
    subjectPatterns: ["Implement X to Y"],
  },
  "normalize-format": {
    description: "Fixes commit message formatting: lowercase subject, trailing periods, extra blank lines",
  },
  "rewrite-message": {
    description: "Uses AI to rewrite the commit message to match your repo's voice (requires API key)",
  },
  "strip-section-headers": {
    description: "Removes decorative divider comments like // --- Init --- in small files",
    maxFileLines: 500,
    patterns: ["// --- Text ---", "# ===== Text =====", "/* --- Text --- */", "// --------- (separator only)"],
  },
  "strip-emoji-comments": {
    description: "Strips emoji characters from code comments",
  },
  "flag-naming": {
    description: "Flags generic class/function suffixes like Manager, Handler, Processor",
    suffixes: ["Manager", "Handler", "Processor", "Service", "Factory", "Builder", "Validator", "Controller", "Orchestrator", "Coordinator"],
    maxIdentifierLength: 40,
  },
  "flag-catch-rethrow": {
    description: "Flags catch blocks that only log the error and re-throw it unchanged",
    detects: "catch blocks with <= 3 lines containing only console.log/error + bare throw (not wrapped errors)",
  },
  "strip-noise-comments": {
    description: "Removes comments where 70%+ of meaningful words appear in the next code line",
    overlapThreshold: 0.7,
  },
  "strip-obvious-docstrings": {
    description: "Removes docstrings on trivial functions where the name says it all",
    maxBodyLines: 5,
    overlapThreshold: 0.6,
    preservedTags: ["@param", "@returns", "@throws", "@example", "@see", "@deprecated", "@since", "@type"],
  },
  "flag-log-bracketing": {
    description: "Flags paired console.log calls that narrate function start/end",
    startPrefixes: ["starting", "begin", "doing", "processing", "fetching", "loading", "connecting"],
    endPrefixes: ["done", "complete", "completed", "finished", "processed", "fetched", "loaded", "connected"],
    maxLinesBetween: 5,
  },
};

export function registerRules(program: Command): void {
  program
    .command("rules")
    .description("List all rules with patterns and status")
    .option("--json", "Output as JSON (for agent consumption)")
    .action(async (options: { json?: boolean }) => {
      const { loadConfig } = await import("../config/index.js");
      const cfg = loadConfig();
      {
        if (options.json) {
          const catalog = rules.map((r) => ({
            name: r.name,
            phase: r.phase,
            type: r.type,
            defaultEnabled: r.defaultEnabled,
            enabled: cfg.rules[r.name] ?? r.defaultEnabled,
            patterns: RULE_PATTERNS[r.name] ?? null,
          }));
          console.log(JSON.stringify(catalog, null, 2));
          return;
        }

        printCompact(dim("rules\n"));

        for (const rule of rules) {
          const enabled = cfg.rules[rule.name] ?? rule.defaultEnabled;
          const icon = enabled ? green("■") : dim("□");
          const phase = dim(`[${rule.phase}]`);
          const type = rule.type === "fix" ? green("fix") : yellow("flag");

          const patterns = RULE_PATTERNS[rule.name];
          const desc = patterns?.description ? ` ${dim("—")} ${dim(String(patterns.description))}` : "";
          console.log(`  ${icon} ${cyan(rule.name)} ${phase} ${type}${desc}`);

          if (patterns) {
            for (const [key, val] of Object.entries(patterns)) {
              if (key === "description") continue;
              if (Array.isArray(val)) {
                console.log(`    ${dim(key + ":")} ${dim(val.join(", "))}`);
              } else {
                console.log(`    ${dim(key + ":")} ${dim(String(val))}`);
              }
            }
          }
        }
        console.log("");
      }
    });
}
