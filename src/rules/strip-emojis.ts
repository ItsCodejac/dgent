import type { Rule, RuleResult } from "./index.js";
import { EMOJI_REGEX } from "../utils/emoji.js";

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
