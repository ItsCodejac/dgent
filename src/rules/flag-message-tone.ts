import type { Rule, RuleResult, Flag } from "./index.js";

const AI_WORDS = [
  "enhance",
  "streamline",
  "comprehensive",
  "utilize",
  "leverage",
  "facilitate",
  "robust",
  "optimize",
];

const AI_PHRASES = [
  "this commit",
  "this change",
  "in order to",
  "aims to",
  "is designed to",
];

const AI_SUBJECT_PATTERNS = [
  /^implement\s+\S+\s+to\s+/i,
];

export const flagMessageTone: Rule = {
  name: "flag-message-tone",
  phase: "commit-msg",
  type: "flag",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const flags: Flag[] = [];
    const lines = input.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      for (const word of AI_WORDS) {
        // Match whole words only
        const regex = new RegExp(`\\b${word}\\b`, "i");
        if (regex.test(line)) {
          flags.push({
            rule: "flag-message-tone",
            line: i + 1,
            message: `AI vocabulary: "${word}"`,
          });
        }
      }

      for (const phrase of AI_PHRASES) {
        if (line.includes(phrase)) {
          flags.push({
            rule: "flag-message-tone",
            line: i + 1,
            message: `AI phrase: "${phrase}"`,
          });
        }
      }

      for (const pattern of AI_SUBJECT_PATTERNS) {
        if (i === 0 && pattern.test(lines[i])) {
          flags.push({
            rule: "flag-message-tone",
            line: 1,
            message: `AI pattern: "Implement X to Y" subject`,
          });
        }
      }
    }

    return {
      output: input,
      changed: false,
      flags,
    };
  },
};
