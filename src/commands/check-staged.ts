import type { Command } from "commander";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, relative } from "node:path";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Rule, Flag } from "../rules/index.js";
import { parseIgnoreComments, filterIgnoredFlags } from "../rules/ignore.js";
import { shouldIgnoreFile } from "../config/ignore-files.js";
import { BINARY_EXTENSIONS, CODE_EXTENSIONS } from "../utils/extensions.js";
import { printCompact, printSuccess } from "../ui/brand.js";
import { dim, green, yellow, cyan, bold, white } from "../ui/colors.js";

interface FileScanResult {
  file: string;
  fixes: string[];
  flags: Flag[];
}

export function registerCheckStaged(program: Command): void {
  program
    .command("check-staged")
    .description("Check staged files for AI tells")
    .option("--json", "Output results as JSON")
    .action(async (options: { json?: boolean }) => {
      // Get staged files
      let stagedFiles: string[];
      try {
        stagedFiles = execFileSync("git", [
          "diff", "--cached", "--name-only", "--diff-filter=ACM",
        ], { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
      } catch {
        if (options.json) {
          console.log(JSON.stringify({ error: "Not a git repository or no staged files" }));
        } else {
          console.error("Not a git repository or no staged files");
        }
        process.exit(1);
        return;
      }

      // Filter to code files, skip binary, respect .dgentignore
      stagedFiles = stagedFiles.filter((f) => {
        const ext = extname(f).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) return false;
        if (!CODE_EXTENSIONS.has(ext)) return false;
        if (shouldIgnoreFile(f)) return false;
        return true;
      });

      if (stagedFiles.length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ files: 0, results: [] }));
        } else {
          printCompact(dim("no staged code files found"));
        }
        return;
      }

      const config = loadConfig();
      const preCommitRules: Rule[] = rules.filter((r) => {
        if (r.phase !== "pre-commit") return false;
        return config.rules[r.name] ?? r.defaultEnabled;
      });

      if (!options.json) {
        printCompact(`${dim("checking")} ${white(String(stagedFiles.length))} ${dim("staged files...")}\n`);
      }

      const results: FileScanResult[] = [];
      let totalFixes = 0;
      let totalFlags = 0;
      let cleanFiles = 0;

      for (const file of stagedFiles) {
        let content: string;
        try {
          content = readFileSync(file, "utf-8");
        } catch {
          continue;
        }

        let modified = content;
        const fileFixes: string[] = [];
        const fileFlags: Flag[] = [];
        const ignoreMap = parseIgnoreComments(content);

        for (const rule of preCommitRules) {
          const result = await rule.apply(modified);
          if (result.changed) {
            modified = result.output;
            fileFixes.push(rule.name);
          }
          if (result.flags.length > 0) {
            const filtered = filterIgnoredFlags(result.flags, ignoreMap);
            fileFlags.push(...filtered);
          }
        }

        if (fileFixes.length === 0 && fileFlags.length === 0) {
          cleanFiles++;
          continue;
        }

        totalFixes += fileFixes.length;
        totalFlags += fileFlags.length;
        const relFile = relative(process.cwd(), file) || file;
        results.push({ file: relFile, fixes: fileFixes, flags: fileFlags });

        if (!options.json) {
          console.error(`  ${yellow("\u25b8")} ${relFile}`);
          for (const fix of fileFixes) {
            console.error(`    ${green("\u25a0")} ${cyan(fix)} ${dim("would fix")}`);
          }
          for (const flag of fileFlags) {
            console.error(`    ${yellow("\u25a0")} ${dim(`[${flag.rule}]`)} ${dim("line")} ${flag.line}: ${flag.message}`);
          }
        }
      }

      if (options.json) {
        console.log(JSON.stringify({
          files: stagedFiles.length,
          clean: cleanFiles,
          filesWithIssues: results.length,
          totalFixes,
          totalFlags,
          results: results.map((r) => ({
            file: r.file,
            fixes: r.fixes,
            flags: r.flags.map((f) => ({ rule: f.rule, line: f.line, message: f.message, suggestion: f.suggestion })),
          })),
        }, null, 2));
        process.exit(totalFlags > 0 ? 1 : 0);
        return;
      }

      // Summary
      console.error("");
      if (results.length === 0) {
        printSuccess(`${stagedFiles.length} staged files checked \u2014 all clean`);
      } else {
        const summary: string[] = [];
        if (totalFixes > 0) summary.push(`${green(String(totalFixes))} ${dim("fixable")}`);
        if (totalFlags > 0) summary.push(`${yellow(String(totalFlags))} ${dim("flagged")}`);
        console.error(`  ${bold(white(String(stagedFiles.length)))} ${dim("staged files checked,")} ${green(String(cleanFiles))} ${dim("clean,")} ${summary.join(dim(", "))}`);

        if (totalFlags > 0) {
          console.error(`  ${dim("Run")} ${cyan("dgent fix <file>")} ${dim("to resolve flags with AI")}`);
        }
      }

      if (totalFlags > 0) process.exit(1);
    });
}
