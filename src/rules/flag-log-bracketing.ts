import type { Rule, RuleResult, Flag } from "./index.js";

const LOG_PATTERN = /console\.(log|info|debug)\s*\(\s*["'`]/;

function extractLogMessage(line: string): string | null {
  const match = line.match(/console\.(?:log|info|debug)\s*\(\s*["'`]([^"'`]*)["'`]/);
  return match ? match[1].toLowerCase() : null;
}

function messagesAreBracketing(msg1: string, msg2: string): boolean {
  // Check if messages describe start/end of same operation
  // Common patterns: "Doing X" / "Done X", "Starting X" / "X complete", "Processing X" / "Processed X"
  const startPrefixes = ["starting", "begin", "doing", "processing", "fetching", "loading", "connecting"];
  const endPrefixes = ["done", "complete", "completed", "finished", "processed", "fetched", "loaded", "connected"];

  const hasStart = startPrefixes.some((p) => msg1.includes(p));
  const hasEnd = endPrefixes.some((p) => msg2.includes(p));

  if (hasStart && hasEnd) return true;

  // Check for word overlap (same operation described differently)
  const words1 = msg1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = msg2.split(/\s+/).filter((w) => w.length > 2);
  const overlap = words1.filter((w) => words2.includes(w));

  return overlap.length >= 1 && (hasStart || hasEnd);
}

export const flagLogBracketing: Rule = {
  name: "flag-log-bracketing",
  phase: "pre-commit",
  type: "flag",
  defaultEnabled: false,

  apply(input: string): RuleResult {
    const flags: Flag[] = [];
    const lines = input.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (!LOG_PATTERN.test(lines[i])) continue;

      const msg1 = extractLogMessage(lines[i]);
      if (!msg1) continue;

      // Look for a matching log within 5 lines
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        if (!LOG_PATTERN.test(lines[j])) continue;

        const msg2 = extractLogMessage(lines[j]);
        if (!msg2) continue;

        if (messagesAreBracketing(msg1, msg2)) {
          flags.push({
            rule: "flag-log-bracketing",
            line: i + 1,
            message: `Log bracketing: "${msg1}" / "${msg2}" — narrates execution flow`,
            suggestion: "Remove narration logs or replace with structured logging",
          });
          break;
        }
      }
    }

    return { output: input, changed: false, flags };
  },
};
