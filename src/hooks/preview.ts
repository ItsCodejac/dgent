import { execFileSync } from "node:child_process";
import { rules } from "../rules/index.js";
import { loadConfig } from "../config/index.js";
import { bold, dim, cyan, green, yellow, white, red } from "../ui/colors.js";

interface CommitPreview {
  hash: string;
  original: string;
  cleaned: string;
  fixes: string[];
  flags: Array<{ rule: string; message: string }>;
}

function getRecentCommits(count: number): Array<{ hash: string; message: string }> {
  try {
    const output = execFileSync("git", ["log", `--format=%h%x00%s`, `-n`, String(count)], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [hash, ...rest] = line.split("\0");
      return { hash, message: rest.join("\0") };
    });
  } catch {
    return [];
  }
}

export async function showInitPreview(): Promise<void> {
  const commits = getRecentCommits(5);
  if (commits.length === 0) return;

  const config = loadConfig();
  const commitMsgRules = rules.filter(
    (r) => r.phase === "commit-msg" && (config.rules[r.name] ?? r.defaultEnabled),
  );

  const previews: CommitPreview[] = [];

  for (const commit of commits) {
    let message = commit.message;
    const fixes: string[] = [];
    const flags: Array<{ rule: string; message: string }> = [];

    for (const rule of commitMsgRules) {
      const result = await rule.apply(message);
      if (result.changed) {
        message = result.output;
        fixes.push(rule.name);
      }
      for (const flag of result.flags) {
        flags.push({ rule: flag.rule, message: flag.message });
      }
    }

    previews.push({
      hash: commit.hash,
      original: commit.message,
      cleaned: message,
      fixes,
      flags,
    });
  }

  const dirty = previews.filter((p) => p.fixes.length > 0 || p.flags.length > 0);
  if (dirty.length === 0) {
    console.error(`\n  ${dim("Your last")} ${commits.length} ${dim("commits are clean. Nice.")}\n`);
    return;
  }

  const totalFixes = dirty.reduce((sum, p) => sum + p.fixes.length, 0);
  const totalFlags = dirty.reduce((sum, p) => sum + p.flags.length, 0);

  console.error(`\n  ${dim("Your last")} ${white(String(commits.length))} ${dim("commits through jent:")}\n`);

  for (const preview of previews) {
    const hashStr = dim(preview.hash);

    if (preview.fixes.length === 0 && preview.flags.length === 0) {
      console.error(`  ${green("✓")} ${hashStr} ${dim(preview.original)}`);
      continue;
    }

    console.error(`  ${yellow("▸")} ${hashStr} ${red(`"${preview.original}"`)}`);

    if (preview.cleaned !== preview.original) {
      console.error(`    ${dim("→")} ${green(`"${preview.cleaned}"`)}`);
    }

    for (const flag of preview.flags) {
      console.error(`    ${yellow("!")} ${dim(flag.message)}`);
    }
  }

  console.error("");
  console.error(`  ${bold(white(String(dirty.length)))}${dim("/")}${commits.length} ${dim("commits had tells.")} ${green(String(totalFixes))} ${dim("fixable,")} ${yellow(String(totalFlags))} ${dim("flagged.")}`);
  console.error("");
}
