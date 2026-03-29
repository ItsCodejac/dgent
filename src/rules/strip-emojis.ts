import type { Rule, RuleResult } from "./index.js";

// Matches most emoji: emoji presentation sequences, modifiers, flags, ZWJ sequences
// Covers Unicode emoji blocks without matching ASCII emoticons like :) or :/
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}\u{26AB}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}]+/gu;

export const stripEmojis: Rule = {
  name: "strip-emojis",
  phase: "commit-msg",
  type: "fix",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    // Remove emojis and clean up resulting double spaces
    let output = input.replace(EMOJI_REGEX, "");
    output = output.replace(/ {2,}/g, " ");

    // Per-line cleanup: trim leading whitespace left by emoji removal at line start,
    // and collapse lines that were emoji-only to empty
    const inputLines = input.split("\n");
    const outputLines = output.split("\n");
    output = outputLines
      .map((line, i) => {
        // If the original line started with non-space content (emoji) and now starts with space, trim
        if (inputLines[i] && /^\S/.test(inputLines[i]) && line.startsWith(" ")) {
          return line.trimStart();
        }
        // Collapse whitespace-only lines (were emoji-only)
        if (line.trim() === "" && line !== "") return "";
        return line;
      })
      .join("\n");

    return {
      output,
      changed: output !== input,
      flags: [],
    };
  },
};
