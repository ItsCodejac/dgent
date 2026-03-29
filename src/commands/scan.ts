import type { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, relative } from "node:path";
import { loadConfig } from "../config/index.js";
import { rules } from "../rules/index.js";
import type { Rule, Flag } from "../rules/index.js";
import { parseIgnoreComments, filterIgnoredFlags } from "../rules/ignore.js";
import { printCompact, printSuccess, printRuleResult, printFlag } from "../ui/brand.js";
import { dim, green, yellow, cyan, bold, white, red } from "../ui/colors.js";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar", ".tgz",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".o",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".pyc", ".class", ".wasm",
]);

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp",
  ".rb", ".swift", ".kt", ".scala", ".cs",
  ".php", ".lua", ".sh", ".bash", ".zsh",
]);

interface FileScanResult {
  file: string;
  fixes: string[];
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

      // Filter to code files only
      files = files.filter((f) => {
        const ext = extname(f).toLowerCase();
        return CODE_EXTENSIONS.has(ext) && !BINARY_EXTENSIONS.has(ext);
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

      for (const file of files) {
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

        results.push({ file: relative(process.cwd(), file) || file, fixes: fileFixes, flags: fileFlags });

        if (!options.json) {
          const relPath = relative(process.cwd(), file) || file;
          console.error(`  ${yellow("▸")} ${relPath}`);
          for (const fix of fileFixes) {
            console.error(`    ${green("■")} ${cyan(fix)} ${dim("would fix")}`);
          }
          for (const flag of fileFlags) {
            console.error(`    ${yellow("■")} ${dim(`[${flag.rule}]`)} ${dim("line")} ${flag.line}: ${flag.message}`);
          }
        }

        if (options.fix && modified !== content) {
          writeFileSync(file, modified, "utf-8");
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
            flags: r.flags.map((f) => ({ rule: f.rule, line: f.line, message: f.message })),
          })),
        }, null, 2));
        process.exit(totalFlags > 0 ? 1 : totalFixes > 0 ? 2 : 0);
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
