import type { Rule, RuleResult } from "./index.js";
import { EMOJI_REGEX } from "../utils/emoji.js";

// Detect if a line is a comment
function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("*/") ||
    trimmed.startsWith('"""') ||
    trimmed.startsWith("'''")
  );
}

export const stripEmojiComments: Rule = {
  name: "strip-emoji-comments",
  phase: "pre-commit",
  type: "fix",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const lines = input.split("\n");
    let changed = false;

    const processed = lines.map((line) => {
      if (!isCommentLine(line)) return line;
      EMOJI_REGEX.lastIndex = 0;
      if (!EMOJI_REGEX.test(line)) return line;
      EMOJI_REGEX.lastIndex = 0;

      let cleaned = line.replace(EMOJI_REGEX, "");
      cleaned = cleaned.replace(/ {2,}/g, " ");

      // If the comment part started with emoji + space, trim the leading space after comment marker
 // e.g., "// Initialize" → "// Initialize" → "// Initialize"
      cleaned = cleaned.replace(/(\/\/|#)\s{2,}/, "$1 ");

      if (cleaned !== line) changed = true;
      return cleaned;
    });

    const output = processed.join("\n");
    return { output, changed, flags: [] };
  },
};
