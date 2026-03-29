import type { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Rule, Flag } from "../rules/index.js";
import { parseIgnoreComments, filterIgnoredFlags } from "../rules/ignore.js";
import { printCompact, printRuleResult, printFlag, printSuccess } from "../ui/brand.js";
import { dim, green, cyan } from "../ui/colors.js";

interface JsonResult {
  file: string | null;
  phase: string;
  clean: boolean;
  fixes: Array<{ rule: string }>;
  flags: Array<{ rule: string; line: number; message: string; suggestion?: string }>;
  output?: string;
}

export function registerRun(program: Command): void {
  program
    .command("run [file]")
    .description("Manual pass on a file or stdin diff")
    .option("--dry-run", "Preview changes without applying")
    .option("--fix", "Write cleaned output back to the file (in-place)")
    .option("--commit-msg", "Run commit message rules only")
    .option("--pre-commit", "Run pre-commit (code) rules only")
    .option("--json", "Output results as JSON (for agent/CI consumption)")
    .option("--check", "Exit 0 if clean, 1 if flags, 2 if fixes — no output")
    .action(async (file: string | undefined, options: { dryRun?: boolean; fix?: boolean; commitMsg?: boolean; preCommit?: boolean; json?: boolean; check?: boolean }, command: Command) => {
      let input: string;

      if (file === "-" || !file) {
        if (!file && process.stdin.isTTY) {
          command.help();
          return;
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
          if (options.json) {
            console.log(JSON.stringify({ error: `Cannot read ${file}` }));
          } else {
            console.error(`Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
          }
          process.exit(1);
        }
      }

      // Skip binary files
      if (file && file !== "-") {
        const binaryExts = new Set([
          ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg",
          ".woff", ".woff2", ".ttf", ".eot", ".otf",
          ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar", ".tgz",
          ".pdf", ".doc", ".docx", ".xls", ".xlsx",
          ".exe", ".dll", ".so", ".dylib", ".o",
          ".mp3", ".mp4", ".wav", ".avi", ".mov",
          ".pyc", ".class", ".wasm",
        ]);
        if (binaryExts.has(extname(file).toLowerCase())) {
          if (options.json) {
            console.log(JSON.stringify({ file, phase: "skipped", clean: true, fixes: [], flags: [] }));
          } else {
            printCompact(`${dim(file)} ${dim("· binary, skipped")}`);
          }
          return;
        }
      }

      let phase: "commit-msg" | "pre-commit" | "both" = "both";
      if (options.commitMsg) phase = "commit-msg";
      if (options.preCommit) phase = "pre-commit";

      if (phase === "both" && file && file !== "-") {
        const codeExtensions = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".rb", ".swift"];
        if (codeExtensions.some((ext) => file.endsWith(ext))) {
          phase = "pre-commit";
        }
      }

      // Auto-detect commit message from stdin: short, no code-like syntax
      if (phase === "both" && (!file || file === "-")) {
        const lines = input.split("\n").filter((l) => l.trim().length > 0);
        const looksLikeCode = lines.some((l) =>
          /^(import |export |const |let |var |function |class |def |if |for |while |return |from |#include)/.test(l.trimStart()),
        );
        if (lines.length <= 10 && !looksLikeCode) {
          phase = "commit-msg";
        }
      }

      const config = loadConfig();
      const ignoreMap = parseIgnoreComments(input);
      let output = input;
      const fixResults: Array<{ rule: string }> = [];
      const flagResults: Flag[] = [];

      const targetRules: Rule[] = rules.filter((r) => {
        if (phase !== "both" && r.phase !== phase) return false;
        return config.rules[r.name] ?? r.defaultEnabled;
      });

      const silent = options.json || options.check;

      if (!silent) {
        const phaseLabel = phase === "both" ? "all rules" : `${phase} rules`;
        printCompact(`${dim(file ?? "stdin")} ${dim("·")} ${dim(phaseLabel)}`);
        console.error("");
      }

      for (const rule of targetRules) {
        const result = await rule.apply(output);

        if (result.changed) {
          output = result.output;
          fixResults.push({ rule: rule.name });
          if (!silent) printRuleResult(rule.name, "fixed");
        } else if (result.flags.length > 0) {
          if (!silent) printRuleResult(rule.name, "flagged");
        }

        const filtered = filterIgnoredFlags(result.flags, ignoreMap);
        for (const flag of filtered) {
          flagResults.push(flag);
          if (!silent) printFlag({ ...flag, file });
        }
      }

      if (options.check) {
        process.exit(flagResults.length > 0 ? 1 : fixResults.length > 0 ? 2 : 0);
        return;
      }

      if (options.json) {
        const jsonResult: JsonResult = {
          file: file ?? null,
          phase,
          clean: fixResults.length === 0 && flagResults.length === 0,
          fixes: fixResults,
          flags: flagResults.map((f) => ({
            rule: f.rule,
            line: f.line,
            message: f.message,
            suggestion: f.suggestion,
          })),
        };
        if (output !== input) {
          jsonResult.output = output;
        }
        console.log(JSON.stringify(jsonResult, null, 2));
        process.exit(flagResults.length > 0 ? 1 : fixResults.length > 0 ? 2 : 0);
        return;
      }

      if (fixResults.length === 0 && flagResults.length === 0) {
        console.error(`  ${green("✓")} ${dim("clean")}`);
      }
      console.error("");

      if (output !== input && options.fix && file && file !== "-") {
        writeFileSync(file, output, "utf-8");
        printSuccess(`${file} fixed`);
      } else if (output !== input && !options.dryRun && (!file || file === "-")) {
        // Stdin mode: write cleaned output to stdout (pipeable)
        process.stdout.write(output);
      } else if (output !== input && !options.dryRun && !options.fix) {
        // File mode without --fix: show as dry-run preview
        console.error(`  ${dim("use")} ${cyan("--fix")} ${dim("to apply, or pipe:")} ${cyan(`dgent run ${file} --fix`)}`);
      } else if (options.dryRun && output !== input) {
        console.error(`  ${dim("dry-run — changes not applied")}`);
      }

      // Exit codes: 0 = clean, 1 = flags found, 2 = fixes applied
      if (flagResults.length > 0) process.exit(1);
      if (fixResults.length > 0) process.exit(2);
    });
}
