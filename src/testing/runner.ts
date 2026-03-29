import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import type { Rule, Flag } from "../rules/index.js";

interface FixturePair {
  name: string;
  inputPath: string;
  expectedPath: string;
  flagsPath?: string;
}

interface FixtureResult {
  name: string;
  rule: string;
  passed: boolean;
  outputMatch: boolean;
  flagsMatch: boolean;
  diff?: string;
  flagsDiff?: string;
}

export function discoverFixtures(fixturesDir: string, ruleName: string): FixturePair[] {
  const ruleDir = join(fixturesDir, ruleName);
  if (!existsSync(ruleDir)) return [];

  const files = readdirSync(ruleDir);
  const inputFiles = files.filter((f) => f.includes(".input."));
  const pairs: FixturePair[] = [];

  for (const inputFile of inputFiles) {
    const ext = extname(inputFile);
    const name = basename(inputFile).replace(`.input${ext}`, "");
    const expectedFile = `${name}.expected${ext}`;
    const flagsFile = `${name}.flags.json`;

    if (!files.includes(expectedFile)) {
      console.warn(`  Warning: no expected file for ${inputFile}`);
      continue;
    }

    pairs.push({
      name,
      inputPath: join(ruleDir, inputFile),
      expectedPath: join(ruleDir, expectedFile),
      flagsPath: files.includes(flagsFile) ? join(ruleDir, flagsFile) : undefined,
    });
  }

  return pairs;
}

function simpleDiff(expected: string, actual: string): string {
  const expLines = expected.split("\n");
  const actLines = actual.split("\n");
  const lines: string[] = [];

  const maxLen = Math.max(expLines.length, actLines.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expLines[i];
    const act = actLines[i];
    if (exp !== act) {
      if (exp !== undefined) lines.push(`  - ${exp}`);
      if (act !== undefined) lines.push(`  + ${act}`);
    }
  }

  return lines.join("\n");
}

function compareFlags(expected: unknown[], actual: Flag[]): { match: boolean; diff?: string } {
  const expStr = JSON.stringify(expected, null, 2);
  const actStr = JSON.stringify(
    actual.map((f) => ({ rule: f.rule, line: f.line, message: f.message })),
    null,
    2,
  );

  if (expStr === actStr) return { match: true };
  return { match: false, diff: `  Expected flags:\n${expStr}\n  Actual flags:\n${actStr}` };
}

export function runFixture(rule: Rule, pair: FixturePair, update: boolean): FixtureResult {
  const input = readFileSync(pair.inputPath, "utf-8");
  const expected = readFileSync(pair.expectedPath, "utf-8");
  const result = rule.apply(input);

  if (update) {
    writeFileSync(pair.expectedPath, result.output, "utf-8");
    return { name: pair.name, rule: rule.name, passed: true, outputMatch: true, flagsMatch: true };
  }

  const outputMatch = result.output === expected;
  let flagsMatch = true;
  let flagsDiff: string | undefined;

  if (pair.flagsPath) {
    const expectedFlags = JSON.parse(readFileSync(pair.flagsPath, "utf-8"));
    const cmp = compareFlags(expectedFlags, result.flags);
    flagsMatch = cmp.match;
    flagsDiff = cmp.diff;
  }

  return {
    name: pair.name,
    rule: rule.name,
    passed: outputMatch && flagsMatch,
    outputMatch,
    flagsMatch,
    diff: outputMatch ? undefined : simpleDiff(expected, result.output),
    flagsDiff,
  };
}

export function runAllFixtures(
  rules: Rule[],
  fixturesDir: string,
  options: { rule?: string; update?: boolean },
): { passed: number; failed: number; total: number } {
  const targetRules = options.rule ? rules.filter((r) => r.name === options.rule) : rules;

  if (options.rule && targetRules.length === 0) {
    console.error(`No rule found matching "${options.rule}"`);
    return { passed: 0, failed: 0, total: 0 };
  }

  let passed = 0;
  let failed = 0;

  for (const rule of targetRules) {
    const pairs = discoverFixtures(fixturesDir, rule.name);
    if (pairs.length === 0) {
      console.log(`  ${rule.name}: no fixtures found`);
      continue;
    }

    console.log(`  ${rule.name}:`);
    for (const pair of pairs) {
      const result = runFixture(rule, pair, options.update ?? false);
      if (result.passed) {
        console.log(`    ✓ ${result.name}`);
        passed++;
      } else {
        console.log(`    ✗ ${result.name}`);
        if (result.diff) console.log(result.diff);
        if (result.flagsDiff) console.log(result.flagsDiff);
        failed++;
      }
    }
  }

  const total = passed + failed;
  console.log(`\n  ${passed}/${total} passed`);
  if (failed > 0) console.log(`  ${failed} failed`);

  return { passed, failed, total };
}
