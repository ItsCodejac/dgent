import type { Command } from "commander";
import { rules } from "../rules/index.js";
import { printCompact } from "../ui/brand.js";
import { dim, cyan, green, yellow } from "../ui/colors.js";

// Export the full pattern lists for machine consumption
const RULE_PATTERNS: Record<string, Record<string, unknown>> = {
  "flag-message-tone": {
    words: ["enhance", "streamline", "comprehensive", "utilize", "leverage", "facilitate", "robust", "optimize"],
    phrases: ["this commit", "this change", "in order to", "aims to", "is designed to"],
    subjectPatterns: ["Implement X to Y"],
  },
  "flag-naming": {
    suffixes: ["Manager", "Handler", "Processor", "Service", "Factory", "Builder", "Validator", "Controller", "Orchestrator", "Coordinator"],
    maxIdentifierLength: 40,
  },
  "strip-trailers": {
    aiEmails: ["noreply@anthropic.com", "github-copilot[bot]", "copilot@github.com", "devin-ai-integration[bot]", "cursor[bot]", "codeium[bot]"],
    trailerPrefixes: ["Generated-By:", "Assisted-By:"],
    footerPatterns: ["🤖 Generated with *"],
  },
  "strip-section-headers": {
    maxFileLines: 500,
    patterns: ["// --- Text ---", "# ===== Text =====", "/* --- Text --- */", "// --------- (separator only)"],
  },
  "flag-catch-rethrow": {
    detects: "catch blocks with <= 3 lines containing only console.log/error + bare throw (not wrapped errors)",
  },
  "flag-log-bracketing": {
    startPrefixes: ["starting", "begin", "doing", "processing", "fetching", "loading", "connecting"],
    endPrefixes: ["done", "complete", "completed", "finished", "processed", "fetched", "loaded", "connected"],
    maxLinesBetween: 5,
  },
  "strip-noise-comments": {
    overlapThreshold: 0.7,
    description: "Removes comments where 70%+ of meaningful words appear in the next code line",
  },
  "strip-obvious-docstrings": {
    maxBodyLines: 5,
    overlapThreshold: 0.6,
    preservedTags: ["@param", "@returns", "@throws", "@example", "@see", "@deprecated", "@since", "@type"],
  },
};

export function registerRules(program: Command): void {
  program
    .command("rules")
    .description("List all rules with patterns and status")
    .option("--json", "Output as JSON (for agent consumption)")
    .action((options: { json?: boolean }) => {
      const config = (async () => {
        const { loadConfig } = await import("../config/index.js");
        return loadConfig();
      })();

      void config.then((cfg) => {
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

          console.log(`  ${icon} ${cyan(rule.name)} ${phase} ${type}`);

          const patterns = RULE_PATTERNS[rule.name];
          if (patterns) {
            for (const [key, val] of Object.entries(patterns)) {
              if (Array.isArray(val)) {
                console.log(`    ${dim(key + ":")} ${dim(val.join(", "))}`);
              } else {
                console.log(`    ${dim(key + ":")} ${dim(String(val))}`);
              }
            }
          }
        }
        console.log("");
      });
    });
}
