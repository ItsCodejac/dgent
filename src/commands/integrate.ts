import type { Command } from "commander";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { printCompact, printSuccess, printInfo } from "../ui/brand.js";
import { dim, cyan } from "../ui/colors.js";

export function registerIntegrate(program: Command): void {
  program
    .command("integrate")
    .description("Install Claude Code skills and agent integrations")
    .action(() => {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const integrationsDir = join(__dirname, "..", "..", "integrations");
      const skillsSource = join(integrationsDir, "skills");

      // Check integrations exist
      if (!existsSync(skillsSource)) {
        // Try npm package path
        const altPath = join(__dirname, "..", "integrations", "skills");
        if (!existsSync(altPath)) {
          printCompact("integrations not found — reinstall dgent");
          return;
        }
      }

      const sourceDir = existsSync(skillsSource)
        ? skillsSource
        : join(__dirname, "..", "integrations", "skills");

      // Install skills to ~/.claude/skills/dgent/
      const claudeSkills = join(homedir(), ".claude", "skills", "dgent");
      mkdirSync(claudeSkills, { recursive: true });

      const skillFiles = readdirSync(sourceDir).filter((f) => f.endsWith(".md"));
      for (const file of skillFiles) {
        copyFileSync(join(sourceDir, file), join(claudeSkills, file));
      }
      printSuccess(`${skillFiles.length} skills installed to ${dim(claudeSkills)}`);

      // Show CLAUDE.md instructions
      const claudeMd = join(integrationsDir, "CLAUDE.md");
      const altClaudeMd = join(__dirname, "..", "integrations", "CLAUDE.md");
      const claudeMdPath = existsSync(claudeMd) ? claudeMd : altClaudeMd;

      console.error("");
      printInfo("Add dgent context to your project:");
      console.error(`    ${cyan(`cat ${claudeMdPath} >> .claude/CLAUDE.md`)}`);
      console.error("");
      printInfo("Or to your global config:");
      console.error(`    ${cyan(`cat ${claudeMdPath} >> ~/.claude/CLAUDE.md`)}`);
      console.error("");
    });
}
