import { bold, dim, cyan, green, red, yellow, gray, white } from "./colors.js";
import type { Flag } from "../rules/index.js";

const VERSION = "0.1.0";

const LOGO = `
  ${dim("┌─────────────────────────┐")}
  ${dim("│")}  ${bold(white("d"))}${cyan("gent")}  ${dim("·")} ${gray("strip the tells")} ${dim("│")}
  ${dim("└─────────────────────────┘")}`;

const LOGO_COMPACT = `${bold(white("d"))}${cyan("gent")}`;

export function printBanner(): void {
  console.error(LOGO);
  console.error(`  ${dim(`v${VERSION}`)}\n`);
}

export function printVersion(): void {
  console.log(`dgent v${VERSION}`);
}

export function printCompact(msg: string): void {
  console.error(`  ${LOGO_COMPACT} ${msg}`);
}

// Status messages
export function printSuccess(msg: string): void {
  console.error(`  ${green("✓")} ${msg}`);
}

export function printWarning(msg: string): void {
  console.error(`  ${yellow("!")} ${msg}`);
}

export function printError(msg: string): void {
  console.error(`  ${red("✗")} ${msg}`);
}

export function printInfo(msg: string): void {
  console.error(`  ${dim("·")} ${msg}`);
}

// Flag formatting
export function printFlag(flag: Flag & { file?: string }): void {
  const location = flag.file
    ? `${dim(flag.file)}${dim(":")}${yellow(String(flag.line))}`
    : `${dim("line")} ${yellow(String(flag.line))}`;
  console.error(`  ${yellow("▸")} ${location} ${flag.message}`);
  if (flag.suggestion) {
    console.error(`    ${dim("→")} ${dim(flag.suggestion)}`);
  }
}

// Rule result formatting
export function printRuleResult(name: string, action: "fixed" | "flagged" | "clean"): void {
  switch (action) {
    case "fixed":
      console.error(`  ${green("■")} ${cyan(name)} ${dim("applied")}`);
      break;
    case "flagged":
      console.error(`  ${yellow("■")} ${cyan(name)} ${dim("flagged")}`);
      break;
    case "clean":
      console.error(`  ${dim("□")} ${dim(name)}`);
      break;
  }
}

// Test result formatting
export function printTestPass(name: string): void {
  console.log(`    ${green("✓")} ${name}`);
}

export function printTestFail(name: string): void {
  console.log(`    ${red("✗")} ${name}`);
}

export function printTestRule(name: string): void {
  console.log(`  ${cyan(name)}${dim(":")}`);
}

export function printTestSummary(passed: number, total: number, failed: number): void {
  console.log("");
  if (failed === 0) {
    console.log(`  ${green(bold(`${passed}/${total} passed`))}`);
  } else {
    console.log(`  ${green(`${passed}/${total} passed`)}  ${red(`${failed} failed`)}`);
  }
}

// Diff formatting
export function printDiff(before: string, after: string): void {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      if (beforeLines[i] !== undefined) console.error(`  ${red("- " + beforeLines[i])}`);
      if (afterLines[i] !== undefined) console.error(`  ${green("+ " + afterLines[i])}`);
    }
  }
}

// Init branding
export function printInitSuccess(hooksDir: string): void {
  console.error(LOGO);
  console.error(`  ${green("Hooks installed")} ${dim("→")} ${gray(hooksDir)}`);
  console.error(`  ${dim("dgent will clean every commit automatically.")}`);
  console.error("");
}

export function printInitConflict(existingPath: string): void {
  console.error(LOGO);
  console.error(`  ${red("Conflict:")} ${dim("core.hooksPath already set")}`);
  console.error(`  ${dim("→")} ${yellow(existingPath)}`);
  console.error("");
  console.error(`  ${dim("To use dgent alongside existing hooks, add to your hook scripts:")}`);
  console.error("");
  console.error(`  ${cyan('dgent hook commit-msg "$@" || true')}`);
  console.error(`  ${cyan('dgent hook pre-commit "$@" || true')}`);
  console.error("");
}

export function printUninstallSuccess(): void {
  console.error(`  ${LOGO_COMPACT} ${green("Hooks removed.")} ${dim("core.hooksPath unset.")}`);
}

// Dry-run header
export function printDryRunHeader(): void {
  console.error(`  ${LOGO_COMPACT} ${dim("[")}${yellow("dry-run")}${dim("]")}`);
}

export { VERSION, LOGO_COMPACT };
