import type { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, relative } from "node:path";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Rule, Flag } from "../rules/index.js";
import { parseIgnoreComments, filterIgnoredFlags } from "../rules/ignore.js";
import { shouldIgnoreFile } from "../config/ignore-files.js";
import { printCompact, printSuccess, printRuleResult, printFlag } from "../ui/brand.js";
import { dim, green, yellow, cyan, bold, white, red } from "../ui/colors.js";
import { BINARY_EXTENSIONS, CODE_EXTENSIONS } from "../utils/extensions.js";

interface FileScanResult {
  file: string;
  fixes: Array<{ rule: string }>;
  flags: Flag[];
}

export function registerScan(program: Command): void {
  program
    .command("scan [dir]")
    .description("Scan a directory for AI tells")
    .option("--fix", "Apply fixes in place")
    .option("--json", "Output results as JSON")
    .option("--dry-run", "Show what --fix would change without writing")
    .action(async (dir: string | undefined, options: { fix?: boolean; json?: boolean; dryRun?: boolean }) => {
      if (options.dryRun) options.fix = false;
      const targetDir = dir ?? ".";

      // Get list of files from git or filesystem
      let files: string[];
      try {
        files = execFileSync("git", [
          "ls-files", "--cached", "--others", "--exclude-standard", targetDir,
        ], { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
      } catch {
        try {
          files = execFileSync("find", [
            targetDir, "-type", "f",
            "-not", "-path", "*/node_modules/*",
            "-not", "-path", "*/.git/*",
            "-not", "-path", "*/dist/*",
          ], { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
        } catch {
          files = [];
        }
      }

      // Filter to code files only, and respect .dgentignore
      files = files.filter((f) => {
        const ext = extname(f).toLowerCase();
        if (!CODE_EXTENSIONS.has(ext) || BINARY_EXTENSIONS.has(ext)) return false;
        if (shouldIgnoreFile(f)) return false;
        return true;
      });

      if (files.length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ files: 0, results: [] }));
        } else {
          printCompact(dim("no code files found"));
        }
        return;
      }

      const config = loadConfig();
      const preCommitRules: Rule[] = rules.filter((r) => {
        if (r.phase !== "pre-commit") return false;
        return config.rules[r.name] ?? r.defaultEnabled;
      });

      if (!options.json) {
        printCompact(`${dim("scanning")} ${white(String(files.length))} ${dim("files...")}\n`);
      }

      const results: FileScanResult[] = [];
      let totalFixes = 0;
      let totalFlags = 0;
      let cleanFiles = 0;
      let filesProcessed = 0;

      const CONCURRENCY = 10;

      async function processFile(file: string): Promise<{ result: FileScanResult | null; modified: string | null; original: string | null }> {
        let content: string;
        try {
          content = readFileSync(file, "utf-8");
        } catch {
          return { result: null, modified: null, original: null };
        }

        let modified = content;
        const fileFixes: Array<{ rule: string }> = [];
        const fileFlags: Flag[] = [];
        const ignoreMap = parseIgnoreComments(content);

        for (const rule of preCommitRules) {
          const result = await rule.apply(modified);
          if (result.changed) {
            modified = result.output;
            fileFixes.push({ rule: rule.name });
          }
          if (result.flags.length > 0) {
            const filtered = filterIgnoredFlags(result.flags, ignoreMap);
            fileFlags.push(...filtered);
          }
        }

        if (fileFixes.length === 0 && fileFlags.length === 0) {
          return { result: null, modified: null, original: null };
        }

        return {
          result: { file: relative(process.cwd(), file) || file, fixes: fileFixes, flags: fileFlags },
          modified,
          original: content,
        };
      }

      // Process files in parallel batches of CONCURRENCY
      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map((file) => processFile(file)));

        for (let j = 0; j < batchResults.length; j++) {
          const { result: fileResult, modified, original } = batchResults[j];

          if (!fileResult) {
            cleanFiles++;
          } else {
            totalFixes += fileResult.fixes.length;
            totalFlags += fileResult.flags.length;
            results.push(fileResult);

            if (!options.json) {
              console.error(`  ${yellow("▸")} ${fileResult.file}`);
              for (const fix of fileResult.fixes) {
                console.error(`    ${green("■")} ${cyan(fix.rule)} ${dim("would fix")}`);
              }
              for (const flag of fileResult.flags) {
                console.error(`    ${yellow("■")} ${dim(`[${flag.rule}]`)} ${dim("line")} ${flag.line}: ${flag.message}`);
              }
            }

            if (options.fix && modified && original && modified !== original) {
              writeFileSync(files[i + j], modified, "utf-8");
            }
          }
        }

        const prevProcessed = filesProcessed;
        filesProcessed += batch.length;
        if (!options.json && Math.floor(filesProcessed / 50) > Math.floor(prevProcessed / 50)) {
          process.stderr.write(`  ${dim(`${filesProcessed}/${files.length} files processed...`)}\n`);
        }
      }

      if (options.json) {
        console.log(JSON.stringify({
          files: files.length,
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
        printSuccess(`${files.length} files scanned — all clean`);
      } else {
        const summary: string[] = [];
        if (totalFixes > 0) summary.push(`${green(String(totalFixes))} ${dim("fixable")}`);
        if (totalFlags > 0) summary.push(`${yellow(String(totalFlags))} ${dim("flagged")}`);
        console.error(`  ${bold(white(String(files.length)))} ${dim("files scanned,")} ${green(String(cleanFiles))} ${dim("clean,")} ${summary.join(dim(", "))}`);

        if (options.fix && totalFixes > 0) {
          console.error(`  ${green("✓")} ${dim("fixes applied to")} ${results.filter((r) => r.fixes.length > 0).length} ${dim("files")}`);
        } else if (totalFixes > 0 && !options.fix) {
          console.error(`  ${dim("Run")} ${cyan("dgent scan --fix")} ${dim("to apply fixes")}`);
        }
        if (totalFlags > 0) {
          console.error(`  ${dim("Run")} ${cyan("dgent fix <file>")} ${dim("to resolve flags with AI")}`);
        }
      }
    });
}
