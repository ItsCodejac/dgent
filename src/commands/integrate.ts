import type { Command } from "commander";
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { printCompact, printSuccess, printInfo } from "../ui/brand.js";
import { dim, cyan, green } from "../ui/colors.js";

function resolveIntegrationsDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const primary = join(__dirname, "..", "..", "integrations");
  if (existsSync(primary)) return primary;
  const alt = join(__dirname, "..", "integrations");
  if (existsSync(alt)) return alt;
  throw new Error("integrations directory not found — reinstall jent");
}

export function registerIntegrate(program: Command): void {
  program
    .command("integrate")
    .description("Install agent skills (Claude Code, OpenClaw)")
    .option("--claude", "Install Claude Code skills only")
    .option("--openclaw", "Install OpenClaw skill only")
    .action((options: { claude?: boolean; openclaw?: boolean }) => {
      const installAll = !options.claude && !options.openclaw;

      let integrationsDir: string;
      try {
        integrationsDir = resolveIntegrationsDir();
      } catch {
        printCompact("integrations not found — reinstall jent");
        return;
      }

      // Claude Code skills
      if (installAll || options.claude) {
        const skillsSource = join(integrationsDir, "skills");
        if (existsSync(skillsSource)) {
          const claudeSkills = join(homedir(), ".claude", "skills", "jent");
          mkdirSync(claudeSkills, { recursive: true });

          const skillFiles = readdirSync(skillsSource).filter((f) => f.endsWith(".md"));
          for (const file of skillFiles) {
            copyFileSync(join(skillsSource, file), join(claudeSkills, file));
          }
          printSuccess(`Claude Code: ${skillFiles.length} skills ${dim("→")} ${dim(claudeSkills)}`);
        }
      }

      // OpenClaw skill
      if (installAll || options.openclaw) {
        const openclawSource = join(integrationsDir, "openclaw");
        if (existsSync(openclawSource)) {
          const openclawSkills = join(homedir(), ".openclaw", "workspace", "skills", "jent");
          mkdirSync(openclawSkills, { recursive: true });

          const skillFiles = readdirSync(openclawSource).filter((f) => f.endsWith(".md"));
          for (const file of skillFiles) {
            copyFileSync(join(openclawSource, file), join(openclawSkills, file));
          }
          printSuccess(`OpenClaw: skill ${dim("→")} ${dim(openclawSkills)}`);
        }
      }

      // CLAUDE.md instructions
      const claudeMd = join(integrationsDir, "CLAUDE.md");
      if (existsSync(claudeMd) && (installAll || options.claude)) {
        console.error("");
        printInfo("Add jent context to your project:");
        console.error(`    ${cyan(`cat ${claudeMd} >> .claude/CLAUDE.md`)}`);
      }

      console.error("");
      printSuccess(`${green("done")} — restart your agent to pick up the skills`);
      console.error("");
    });
}
