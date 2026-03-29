import type { Rule, RuleResult } from "./index.js";

const CONVENTIONAL_TYPES = [
  "feat", "fix", "chore", "docs", "refactor", "test",
  "perf", "ci", "build", "style", "revert",
];

// Matches: Type(scope): description  or  Type: description
const CONVENTIONAL_REGEX = /^([A-Za-z]+)(\([^)]*\))?:\s*(.*)/;

export const normalizeFormat: Rule = {
  name: "normalize-format",
  phase: "commit-msg",
  type: "fix",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const lines = input.split("\n");
    const subject = lines[0];

    if (!subject) {
      return { output: input, changed: false, flags: [] };
    }

    const match = subject.match(CONVENTIONAL_REGEX);
    if (!match) {
      // Not a conventional commit format — leave it alone
      return { output: input, changed: false, flags: [] };
    }

    const [, rawType, scope, rawDescription] = match;
    const typeLower = rawType.toLowerCase();

    // Only act on known conventional commit types
    if (!CONVENTIONAL_TYPES.includes(typeLower)) {
      return { output: input, changed: false, flags: [] };
    }

    // Apply fixes
    let description = rawDescription;

    // Remove trailing period
    if (description.endsWith(".")) {
      description = description.slice(0, -1);
    }

    // Lowercase first character of description — but skip acronyms (e.g., "URL", "API")
    const firstWord = description.split(/\s/)[0];
    const isAcronym = firstWord && firstWord === firstWord.toUpperCase() && firstWord.length >= 2;
    if (description.length > 0 && /^[A-Z]/.test(description) && !isAcronym) {
      description = description[0].toLowerCase() + description.slice(1);
    }

    const scopePart = scope ?? "";
    const newSubject = `${typeLower}${scopePart}: ${description}`;

    if (newSubject === subject) {
      return { output: input, changed: false, flags: [] };
    }

    lines[0] = newSubject;
    const output = lines.join("\n");

    return {
      output,
      changed: true,
      flags: [],
    };
  },
};
