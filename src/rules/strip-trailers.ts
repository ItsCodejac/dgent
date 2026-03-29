import type { Rule, RuleResult } from "./index.js";

const AI_EMAIL_PATTERNS = [
  "noreply@anthropic.com",
  "github-copilot[bot]",
  "copilot@github.com",
  "devin-ai-integration[bot]",
  "cursor[bot]",
  "codeium[bot]",
];

const AI_TRAILER_PREFIXES = [
  /^generated-by:\s/i,
  /^assisted-by:\s/i,
];

const GENERATED_WITH_PATTERN = /^🤖\s*generated with\s/i;

function isAiTrailer(line: string): boolean {
  const trimmed = line.trim();

  // Check "Generated with" footer
  if (GENERATED_WITH_PATTERN.test(trimmed)) return true;

  // Check non-Co-Authored-By AI trailers
  for (const prefix of AI_TRAILER_PREFIXES) {
    if (prefix.test(trimmed)) return true;
  }

  // Check Co-Authored-By with AI email patterns
  const coAuthorMatch = trimmed.match(/^co-authored-by:\s*.+<(.+)>/i);
  if (coAuthorMatch) {
    const email = coAuthorMatch[1].toLowerCase();
    return AI_EMAIL_PATTERNS.some((pattern) => email.includes(pattern));
  }

  return false;
}

export const stripTrailers: Rule = {
  name: "strip-trailers",
  phase: "commit-msg",
  type: "fix",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const lines = input.split("\n");
    const filtered = lines.filter((line) => !isAiTrailer(line));

    // Remove trailing blank lines
    while (filtered.length > 0 && filtered[filtered.length - 1].trim() === "") {
      filtered.pop();
    }

    // Add back single trailing newline if input had one
    const output = filtered.join("\n") + (input.endsWith("\n") ? "\n" : "");

    return {
      output,
      changed: output !== input,
      flags: [],
    };
  },
};
