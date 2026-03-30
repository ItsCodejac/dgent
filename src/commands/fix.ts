import type { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { getApiKey } from "../config/secrets.js";
import { rules } from "../rules/index.js";
import type { Rule, Flag } from "../rules/index.js";
import { callSkill } from "../ai/client.js";
import { loadSkill } from "../ai/skill-loader.js";
import { printCompact, printSuccess, printWarning, printFlag, printRuleResult, printError } from "../ui/brand.js";
import { dim, cyan, yellow, green } from "../ui/colors.js";

const FIX_CODE_SCHEMA = {
  type: "object",
  properties: {
    fixed_code: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flag: { type: "string" },
          description: { type: "string" },
        },
        required: ["flag", "description"],
      },
    },
  },
  required: ["fixed_code", "changes"],
} as const;

const FIX_MESSAGE_SCHEMA = {
  type: "object",
  properties: {
    fixed_message: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flag: { type: "string" },
          description: { type: "string" },
        },
        required: ["flag", "description"],
      },
    },
  },
  required: ["fixed_message", "changes"],
} as const;

interface FixCodeResult {
  fixed_code: string;
  changes: Array<{ flag: string; description: string }>;
}

interface FixMessageResult {
  fixed_message: string;
  changes: Array<{ flag: string; description: string }>;
}

export function registerFix(program: Command): void {
  program
    .command("fix [file]")
    .description("Use AI (Anthropic API) to fix flagged issues — requires API key")
    .option("--commit-msg", "Fix a commit message instead of code")
    .option("--dry-run", "Show fixes without applying")
    .option("--json", "Output results as JSON")
    .action(async (file: string | undefined, options: { commitMsg?: boolean; dryRun?: boolean; json?: boolean }) => {
      if (!getApiKey()) {
        if (options.json) {
          console.log(JSON.stringify({ file: file ?? null, fixed: false, changes: [], error: "No API key configured." }));
        } else {
          printError("No API key configured.");
          console.error(`  ${dim("Run")} ${cyan("dgent config set api-key <key>")} ${dim("first.")}`);
        }
        process.exit(1);
      }

      let input: string;

      if (file === "-" || !file) {
        if (!file && process.stdin.isTTY) {
          if (options.json) {
            console.log(JSON.stringify({ file: null, fixed: false, changes: [], error: "Usage: dgent fix <file> or pipe input via stdin" }));
          } else {
            console.error("Usage: dgent fix <file> or pipe input via stdin");
          }
          process.exit(1);
        }
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk as Buffer);
        }
        input = Buffer.concat(chunks).toString("utf-8");
      } else {
        try {
          input = readFileSync(file, "utf-8");
        } catch (err) {
          const errMsg = `Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`;
          if (options.json) {
            console.log(JSON.stringify({ file, fixed: false, changes: [], error: errMsg }));
          } else {
            printError(errMsg);
          }
          process.exit(1);
        }
      }

      // Run rules to find flags
      const config = loadConfig();
      const phase = options.commitMsg ? "commit-msg" : "pre-commit";
      const targetRules: Rule[] = rules.filter((r) => {
        if (r.phase !== phase) return false;
        if (r.type !== "flag") return false;
        return config.rules[r.name] ?? r.defaultEnabled;
      });

      const allFlags: Flag[] = [];
      for (const rule of targetRules) {
        const result = await rule.apply(input);
        allFlags.push(...result.flags);
      }

      if (allFlags.length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ file: file ?? null, fixed: true, changes: [], error: null }));
        } else {
          printCompact(`${green("✓")} ${dim("no flags to fix")}`);
        }
        return;
      }

      if (!options.json) {
        printCompact(`${yellow(`${allFlags.length} flag${allFlags.length > 1 ? "s" : ""}`)} ${dim("→ calling AI")}`);
        console.error("");
        for (const flag of allFlags) {
          printFlag({ ...flag, file });
        }
        console.error("");
      }

      // Build prompt
      const skill = loadSkill();
      const flagDescriptions = allFlags
        .map((f) => `- Line ${f.line}: [${f.rule}] ${f.message}`)
        .join("\n");

      if (options.commitMsg) {
        const userContent = [
          "## Fix these flags in the commit message:",
          flagDescriptions,
          "",
          "## Commit message:",
          input,
        ].join("\n");

        const result = await callSkill<FixMessageResult>(
          skill,
          userContent,
          FIX_MESSAGE_SCHEMA as unknown as Record<string, unknown>,
        );

        if (!result) {
          if (options.json) {
            console.log(JSON.stringify({ file: file ?? null, fixed: false, changes: [], error: "AI could not generate fixes." }));
            process.exit(1);
          } else {
            printWarning("AI could not generate fixes. Address flags manually.");
          }
          return;
        }

        if (result.fixed_message === input) {
          if (options.json) {
            console.log(JSON.stringify({ file: file ?? null, fixed: true, changes: [], error: null }));
          } else {
            printCompact(dim("no changes suggested"));
          }
          return;
        }

        if (options.json) {
          if (!options.dryRun && file && file !== "-") {
            writeFileSync(file, result.fixed_message, "utf-8");
          }
          console.log(JSON.stringify({ file: file ?? null, fixed: true, changes: result.changes, error: null }));
          return;
        }

        for (const change of result.changes) {
          printRuleResult(change.flag, "fixed");
          console.error(`    ${dim(change.description)}`);
        }
        console.error("");

        if (options.dryRun) {
          console.error(`  ${dim("dry-run — would produce:")}`);
          console.error("");
          console.log(result.fixed_message);
        } else if (file && file !== "-") {
          writeFileSync(file, result.fixed_message, "utf-8");
          printSuccess(`${file} fixed`);
        } else {
          console.log(result.fixed_message);
        }
      } else {
        const userContent = [
          "## Fix these flags in the code:",
          flagDescriptions,
          "",
          "## Code:",
          "```",
          input,
          "```",
        ].join("\n");

        const result = await callSkill<FixCodeResult>(
          skill,
          userContent,
          FIX_CODE_SCHEMA as unknown as Record<string, unknown>,
        );

        if (!result) {
          if (options.json) {
            console.log(JSON.stringify({ file: file ?? null, fixed: false, changes: [], error: "AI could not generate fixes." }));
            process.exit(1);
          } else {
            printWarning("AI could not generate fixes. Address flags manually.");
          }
          return;
        }

        if (result.fixed_code === input) {
          if (options.json) {
            console.log(JSON.stringify({ file: file ?? null, fixed: true, changes: [], error: null }));
          } else {
            printCompact(dim("no changes suggested"));
          }
          return;
        }

        if (options.json) {
          if (!options.dryRun && file && file !== "-") {
            writeFileSync(file, result.fixed_code, "utf-8");
          }
          console.log(JSON.stringify({ file: file ?? null, fixed: true, changes: result.changes, error: null }));
          return;
        }

        for (const change of result.changes) {
          printRuleResult(change.flag, "fixed");
          console.error(`    ${dim(change.description)}`);
        }
        console.error("");

        if (options.dryRun) {
          console.error(`  ${dim("dry-run — would produce:")}`);
          console.error("");
          console.log(result.fixed_code);
        } else if (file && file !== "-") {
          writeFileSync(file, result.fixed_code, "utf-8");
          printSuccess(`${file} fixed`);
        } else {
          console.log(result.fixed_code);
        }
      }
    });
}
